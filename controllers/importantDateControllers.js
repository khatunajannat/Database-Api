import ImportantDate from '../models/importantDate.js';

//get all imp date for user and admin
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

//get all imp date for only admin
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
//create  for admin only

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

// update- only admin 
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

// delete -only admin
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
