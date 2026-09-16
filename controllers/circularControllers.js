import Circular from '../models/circular.js';

// GET /api/circulars — public, supports optional ?type= & ?status= filters
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

// GET /api/circulars/:id — public
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

// POST /api/circulars — admin only
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

// PUT /api/circulars/:id — admin only
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

// DELETE /api/circulars/:id — admin only
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
