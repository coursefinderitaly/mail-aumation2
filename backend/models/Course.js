const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  sNo: { type: Number },
  universityName: { type: String, required: true },
  duration: { type: String },
  subField: { type: String },
  programName: { type: String, required: true },
  languageRequirement: { type: String },
  admissionTest: { type: String }
}, { timestamps: true });

// Index for text-based search in the matching engine
courseSchema.index({ subField: 'text', programName: 'text' });

module.exports = mongoose.model('Course', courseSchema);
