const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  studentName: { type: String },
  emailId: { type: String }, // To link back to thread
  success: { type: Boolean, default: false },
  errorMessage: { type: String },
  matchedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
}, { timestamps: true });

module.exports = mongoose.model('Log', logSchema);
