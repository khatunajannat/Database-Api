import ImportantDate from '../models/importantDate.js';

// GET /api/important-dates — public, supports optional ?type= & ?category= filters
export const getAllImportantDates = async (req, res) => {
  try {
    const { type, category } = req.query;
    const filter = {};
    if (type && type !== 'all') filter.type = type;
    if (category && category !== 'all') filter.category = category;

    const events = await ImportantDate.find(filter).sort({ date: 1 });
    return res.status(200).json(events);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/important-dates/:id — public
export const getImportantDateById = async (req, res) => {
  try {
    const event = await ImportantDate.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    return res.status(200).json(event);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /api/important-dates — admin only
export const createImportantDate = async (req, res) => {
  try {
    const { title, university, type, category, date } = req.body;

    if (!title || !university || !type || !category || !date) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const event = await ImportantDate.create({ title, university, type, category, date });
    return res.status(201).json({ message: "Event created", event });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// PUT /api/important-dates/:id — admin only
export const updateImportantDate = async (req, res) => {
  try {
    const event = await ImportantDate.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json({ message: "Event updated", event });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// DELETE /api/important-dates/:id — admin only
export const deleteImportantDate = async (req, res) => {
  try {
    const event = await ImportantDate.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    return res.status(200).json({ message: "Event deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
