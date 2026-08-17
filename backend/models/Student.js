const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  learnerName: { type: String, required: true },
  age: { type: Number },
  class12Stream: { type: String },
  class12Score: { type: mongoose.Schema.Types.Mixed }, // Can be Number or String (e.g. 69.33%)
  class12Year: { type: Number },
  class12Board: { type: String },
  class10Score: { type: mongoose.Schema.Types.Mixed },
  class10Year: { type: Number },
  workExperience: { type: Number, default: 0 },
  programOfInterest: { type: String },
  intakePitched: { type: String },
  eligibilityCountry: { type: String },
  acComments: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
