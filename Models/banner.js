import mongoose from "mongoose";
const { Schema } = mongoose;

// One slide of the home-page carousel
const bannerSchema = new Schema(
  {
    imageUrl: { type: String, required: true },
    publicId: { type: String, required: true }, // Cloudinary id, needed to delete the image later
    title: { type: String, trim: true, default: "" },
    subtitle: { type: String, trim: true, default: "" },
    ctaLabel: { type: String, trim: true, default: "" },
    ctaLink: { type: String, trim: true, default: "" },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.models.Banner || mongoose.model("Banner", bannerSchema);
