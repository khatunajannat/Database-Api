import mongoose from "mongoose";
const { Schema } = mongoose;

// Only metadata about an uploaded file lives in MongoDB. The file itself is on disk.
const fileSchema = new Schema(
  {
    filename: String,     // generated name on disk
    originalName: String, // what the user called it
    mimeType: String,
    size: Number,
  },
  { _id: false }
);

export const DOC_KEYS = [
  "photo", "signature", "nidSelf", "nidFather",
  "nidMother", "sscCertificate", "hscCertificate",
];

const profileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    personal: {
      nameEn: String, nameBn: String, dob: String, gender: String, religion: String,
      nationality: String, bloodGroup: String, nid: String, birthRegNo: String,
    },
    academic: {
      sscBoard: String, sscRoll: String, sscRegNo: String, sscYear: String, sscGpa: String, sscGroup: String,
      hscBoard: String, hscRoll: String, hscRegNo: String, hscYear: String, hscGpa: String, hscGroup: String,
    },
    guardian: {
      fatherName: String, fatherOccupation: String, fatherPhone: String,
      motherName: String, motherOccupation: String, motherPhone: String,
      guardianEmail: String, applicantPhone: String,
      presentAddress: String, permanentAddress: String,
      division: String, district: String, postCode: String,
    },
    documents: Object.fromEntries(DOC_KEYS.map((k) => [k, fileSchema])),
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("Profile", profileSchema);
