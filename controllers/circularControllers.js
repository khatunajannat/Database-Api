import Circular from '../models/circular.js';

// get all circulars for user and admin
export const getAllCirculars = async (req, res) => {
  try {
    const { type, status } = req.query;
    const filter = {};
    if (type && type !== 'all') filter.type = type;
    if (status && status !== 'all') filter.status = status;

    const circulars = await Circular.find(filter).sort({ publishedDate: -1 });
    return res.status(200).json(circulars);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// get circular by ID for user and admin
export const getCircularById = async (req, res) => {
  try {
    const circular = await Circular.findById(req.params.id);
    if (!circular) {
      return res.status(404).json({ message: "Circular not found" });
    }
    return res.status(200).json(circular);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// create circular — admin only
export const createCircular = async (req, res) => {
  try {
    const { university, type, unit, title, publishedDate, examDate, applyDeadline, status, link } = req.body;

    if (!university || !type || !unit || !title || !publishedDate || !applyDeadline || !link) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const circular = await Circular.create({
      university,
      type,
      unit,
      title,
      publishedDate,
      examDate: examDate || null,
      applyDeadline,
      status: status || 'upcoming',
      link,
    });

    return res.status(201).json({ message: "Circular created", circular });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// update circular(put in mongo) — admin only
export const updateCircular = async (req, res) => {
  try {
    const circular = await Circular.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!circular) {
      return res.status(404).json({ message: "Circular not found" });
    }

    return res.status(200).json({ message: "Circular updated", circular });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// delete circular — admin only
export const deleteCircular = async (req, res) => {
  try {
    const circular = await Circular.findByIdAndDelete(req.params.id);
    if (!circular) {
      return res.status(404).json({ message: "Circular not found" });
    }
    return res.status(200).json({ message: "Circular deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
