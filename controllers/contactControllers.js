import Contact from "../Models/contact.js";

export const createContact = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    console.log("Contact data received:", req.body);

    const contact = new Contact({
      name,
      email,
      message
    });

    await contact.save();

    console.log("Contact saved successfully");

    res.status(201).json({
      message: "Message sent successfully"
    });
  } catch (error) {
    console.error("CONTACT ERROR:", error);

    res.status(500).json({
      message: "Failed to send message",
      error: error.message
    });
  }
};