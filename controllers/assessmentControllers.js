import Assessment from "../Models/assessment.js";

// GET all assessments — public
export const getAllAssessments = async (req, res) => {
  try {
    const assessments = await Assessment.find().sort({ name: 1 });
    return res.status(200).json(assessments);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET one assessment — public
export const getAssessmentById = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    return res.status(200).json(assessment);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// CREATE assessment — admin only
export const createAssessment = async (req, res) => {
  try {
    const assessment = await Assessment.create(req.body);

    return res.status(201).json({
      message: "Assessment created",
      assessment,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// UPDATE assessment — admin only
export const updateAssessment = async (req, res) => {
  try {
    const assessment = await Assessment.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    return res.status(200).json({
      message: "Assessment updated",
      assessment,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// DELETE assessment — admin only
export const deleteAssessment = async (req, res) => {
  try {
    const assessment = await Assessment.findByIdAndDelete(req.params.id);

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    return res.status(200).json({
      message: "Assessment deleted",
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};