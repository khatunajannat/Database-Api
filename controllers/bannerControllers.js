import { sendServerError } from '../utils/httpError.js';
import Banner from "../models/banner.js";
import cloudinary from "../config/cloudinary.js";

const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "admito/banners",
          resource_type: "image",
          // keep slides light: cap width, auto quality/format
          transformation: [{ width: 1920, height: 1080, crop: "limit" }, { quality: "auto", fetch_format: "auto" }],
        },
        (err, result) => (err ? reject(err) : resolve(result))
      )
      .end(buffer);
  });

const pick = (body) => {
  const out = {};
  for (const k of ["title", "subtitle", "ctaLabel", "ctaLink"]) if (body[k] !== undefined) out[k] = body[k];
  if (body.order !== undefined && body.order !== "") out.order = Number(body.order);
  if (body.active !== undefined) out.active = body.active === true || body.active === "true";
  return out;
};

// PUBLIC: active slides only, in display order
export const getActiveBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ active: true }).sort({ order: 1, createdAt: -1 });
    res.set("Cache-Control", "public, max-age=60");
    return res.status(200).json(banners);
  } catch (err) {
    return sendServerError(res, err);
  }
};

// ADMIN: every slide, including hidden ones
export const getAllBanners = async (req, res) => {
  try {
    return res.status(200).json(await Banner.find().sort({ order: 1, createdAt: -1 }));
  } catch (err) {
    return sendServerError(res, err);
  }
};

export const createBanner = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Please choose an image" });
    const result = await uploadToCloudinary(req.file.buffer);
    const last = await Banner.findOne().sort({ order: -1 });
    const banner = await Banner.create({
      ...pick(req.body),
      order: req.body.order !== undefined && req.body.order !== "" ? Number(req.body.order) : (last?.order ?? -1) + 1,
      imageUrl: result.secure_url,
      publicId: result.public_id,
    });
    return res.status(201).json({ message: "Slide added", banner });
  } catch (err) {
    return sendServerError(res, err);
  }
};

export const updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: "Slide not found" });

    Object.assign(banner, pick(req.body));

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      await cloudinary.uploader.destroy(banner.publicId).catch(() => {});
      banner.imageUrl = result.secure_url;
      banner.publicId = result.public_id;
    }
    await banner.save();
    return res.status(200).json({ message: "Slide updated", banner });
  } catch (err) {
    return sendServerError(res, err);
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ message: "Slide not found" });
    await cloudinary.uploader.destroy(banner.publicId).catch(() => {});
    return res.status(200).json({ message: "Slide deleted" });
  } catch (err) {
    return sendServerError(res, err);
  }
};
