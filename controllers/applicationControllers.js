import mongoose from 'mongoose';
import Application from '../models/application.js';
import Circular from '../models/circular.js';
import ImportantDate from '../models/importantDate.js';

const generateApplicationNo = () =>
  `ADM-${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;

// Build the progress timeline for the Application Status page.
// Every step is "done" once its date has passed; the last done step is current.
function buildTimeline(application, dates) {
  const now = new Date();

  const steps = [
    {
      key: 'applied',
      title: 'Application submitted',
      date: application.createdAt,
    },
    ...dates.map((d) => ({ key: d.category, title: d.title, date: d.date })),
  ]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((s) => ({ ...s, done: new Date(s.date) <= now }));

  const currentIndex = steps.map((s) => s.done).lastIndexOf(true);

  return {
    timeline: steps.map((s, i) => ({ ...s, current: i === currentIndex })),
    currentStage: currentIndex >= 0 ? steps[currentIndex] : null,
  };
}

// Attach timeline + currentStage to a list of (lean) applications
async function attachTimelines(applications) {
  const circularIds = applications.map((a) => a.circular?._id || a.circular);
  const dates = await ImportantDate.find({ circular: { $in: circularIds } })
    .sort({ date: 1 })
    .lean();

  return applications.map((app) => {
    const id = String(app.circular?._id || app.circular);
    const appDates = dates.filter((d) => String(d.circular) === id);
    return { ...app, ...buildTimeline(app, appDates) };
  });
}

// POST /api/applications — logged-in user submits a demo application
export const submitApplication = async (req, res) => {
  try {
    const { circularId, formData } = req.body;

    if (!circularId || !formData) {
      return res.status(400).json({ message: "circularId and formData are required" });
    }
    if (!mongoose.isValidObjectId(circularId)) {
      return res.status(400).json({ message: "Invalid circularId" });
    }

    const circular = await Circular.findById(circularId);
    if (!circular) {
      return res.status(404).json({ message: "Circular not found" });
    }
    if (circular.status === 'closed') {
      return res.status(400).json({ message: "Applications are closed for this circular" });
    }

    const existing = await Application.findOne({
      user: req.user.id,
      circular: circular._id,
    });
    if (existing) {
      return res.status(409).json({ message: "You have already applied to this circular" });
    }

    const application = await Application.create({
      user: req.user.id,
      circular: circular._id,
      university: circular.university,
      unit: circular.unit,
      title: circular.title,
      applicationNo: generateApplicationNo(),
      formData,
    });

    return res.status(201).json({ message: "Application submitted (demo)", application });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === 11000) {
      return res.status(409).json({ message: "You have already applied to this circular" });
    }
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/applications/my — all of the user's applications with progress
export const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ user: req.user.id })
      .populate('circular', 'status link examDate applyDeadline')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(await attachTimelines(applications));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/applications/:id — one of the user's own applications
export const getApplicationById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid application id" });
    }

    const application = await Application.findOne({
      _id: req.params.id,
      user: req.user.id,
    })
      .populate('circular', 'status link examDate applyDeadline')
      .lean();

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const [withTimeline] = await attachTimelines([application]);
    return res.status(200).json(withTimeline);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// DELETE /api/applications/:id — user withdraws their own application
export const deleteApplication = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid application id" });
    }

    const application = await Application.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }
    return res.status(200).json({ message: "Application withdrawn" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};