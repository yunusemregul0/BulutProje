const mongoose = require('mongoose');

const editHistorySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  changes: {
    title: String,
    code: String,
    language: String,
    description: String,
    tags: [String]
  },
  editedAt: {
    type: Date,
    default: Date.now
  }
});

const snippetSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true,
    default: 'text'
  },
  description: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  folderPath: {
    type: String,
    required: true,
    default: '/',
    trim: true
  },
  userId: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userName: String,
  isPublic: {
    type: Boolean,
    default: false
  },
  isFolderMarker: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    type: String,
    trim: true
  }],
  canEdit: [{
    type: String,
    trim: true
  }],
  editHistory: [editHistorySchema],
  forks: [{
    userId: String,
    snippetId: String,
    createdAt: Date
  }],
  likes: [{
    userId: String,
    createdAt: Date
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
snippetSchema.index({ userId: 1, folderPath: 1 });
snippetSchema.index({ folderPath: 1, userId: 1 });
snippetSchema.index({ folderPath: 1, isPublic: 1 });
snippetSchema.index({ sharedWith: 1 });
snippetSchema.index({ isPublic: 1, createdAt: -1 });
snippetSchema.index({ isFolderMarker: 1, userId: 1 });

// Ensure folderPath starts with '/'
snippetSchema.pre('save', function(next) {
  if (this.folderPath && !this.folderPath.startsWith('/')) {
    this.folderPath = '/' + this.folderPath;
  }
  next();
});

// Update the updatedAt timestamp before saving
snippetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Snippet', snippetSchema); 