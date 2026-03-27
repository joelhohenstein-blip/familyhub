import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Create output directory if it doesn't exist
const outputDir = path.join(process.cwd(), 'public', 'testing-docs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// ============================================
// TESTING GUIDE PDF
// ============================================
function generateTestingGuide() {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
  });

  const filePath = path.join(outputDir, 'Testing-Guide.pdf');
  doc.pipe(fs.createWriteStream(filePath));

  // Title
  doc.fontSize(28).font('Helvetica-Bold').text('Family Connect', { align: 'center' });
  doc.fontSize(14).font('Helvetica').text('Comprehensive Testing Guide', { align: 'center' });
  doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown(2);

  // Table of Contents
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#000').text('Table of Contents');
  doc.fontSize(11).font('Helvetica').moveDown(0.5);
  const sections = [
    '1. Getting Started',
    '2. Authentication & Onboarding',
    '3. Family Management',
    '4. Messaging & Communication',
    '5. Video Calls',
    '6. Media & Photos',
    '7. Timeline & Memories',
    '8. Organization Features',
    '9. Settings & Preferences',
    '10. Admin Features',
    '11. Cross-Device Testing',
    '12. Performance & Edge Cases',
    '13. Bug Reporting',
  ];
  sections.forEach(section => {
    doc.text(section, { indent: 20 });
  });

  doc.addPage();

  // Section 1: Getting Started
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#000').text('1. Getting Started');
  doc.fontSize(11).font('Helvetica').moveDown(0.5);
  doc.text('Welcome to the Family Connect testing program! This guide will walk you through all features and help you identify any issues.');
  doc.moveDown(0.5);
  doc.text('Test Environment URL:', { underline: true });
  doc.fontSize(10).text('https://familyconnect.pre.dev', { color: '#0066cc' });
  doc.moveDown(0.5);
  doc.fontSize(11).text('Test Accounts:', { underline: true });
  doc.text('You will receive test account credentials via email. Each account has different roles (Admin, Parent, Child).');
  doc.moveDown(0.5);
  doc.text('Duration:', { underline: true });
  doc.text('Please complete testing within 2 weeks. Report critical bugs immediately.');
  doc.moveDown(1);

  // Section 2: Authentication & Onboarding
  doc.fontSize(16).font('Helvetica-Bold').text('2. Authentication & Onboarding');
  doc.fontSize(11).font('Helvetica').moveDown(0.5);
  doc.text('Test the following authentication flows:');
  doc.moveDown(0.3);
  
  const authTests = [
    { title: 'Sign Up', steps: ['Visit the app', 'Click "Sign Up"', 'Enter email and password', 'Verify email confirmation', 'Complete profile setup'] },
    { title: 'Login', steps: ['Enter email and password', 'Verify successful login', 'Check redirect to dashboard'] },
    { title: 'Password Reset', steps: ['Click "Forgot Password"', 'Enter email', 'Check email for reset link', 'Reset password', 'Login with new password'] },
    { title: 'Create First Family', steps: ['After signup, create a family', 'Enter family name', 'Set family photo', 'Verify family created'] },
  ];

  authTests.forEach(test => {
    doc.fontSize(10).font('Helvetica-Bold').text(`✓ ${test.title}`, { indent: 20 });
    test.steps.forEach(step => {
      doc.fontSize(9).font('Helvetica').text(`• ${step}`, { indent: 40 });
    });
    doc.moveDown(0.3);
  });

  doc.moveDown(0.5);

  // Section 3: Family Management
  doc.fontSize(16).font('Helvetica-Bold').text('3. Family Management');
  doc.fontSize(11).font('Helvetica').moveDown(0.5);
  doc.text('Test family creation, member management, and roles:');
  doc.moveDown(0.3);

  const familyTests = [
    'Create a new family',
    'Invite family members via email',
    'Accept family invitation',
    'Assign roles (Admin, Parent, Child)',
    'Change member roles',
    'Remove family members',
    'View family member list',
    'Edit family settings',
  ];

  familyTests.forEach(test => {
    doc.fontSize(10).text(`☐ ${test}`, { indent: 20 });
  });

  doc.addPage();

  // Section 4: Messaging & Communication
  doc.fontSize(16).font('Helvetica-Bold').text('4. Messaging & Communication');
  doc.fontSize(11).font('Helvetica').moveDown(0.5);
  doc.text('Test real-time messaging features:');
  doc.moveDown(0.3);

  const messagingTests = [
    'Send text message',
    'Send message with emoji',
    'Send message with file attachment',
    'Receive message in real-time',
    'Pin important message',
    'Unpin message',
    'Archive conversation',
    'Search messages',
    'Delete message',
    'Edit message',
    'See typing indicator',
    'See read receipts',
  ];

  messagingTests.forEach(test => {
    doc.fontSize(10).text(`☐ ${test}`, { indent: 20 });
  });

  doc.moveDown(0.5);

  // Section 5: Video Calls
  doc.fontSize(16).font('Helvetica-Bold').text('5. Video Calls');
  doc.fontSize(11).font('Helvetica').moveDown(0.5);
  doc.text('Test video calling functionality:');
  doc.moveDown(0.3);

  const videoTests = [
    'Initiate video call',
    'Receive video call notification',
    'Accept video call',
    'Decline video call',
    'Audio quality during call',
    'Video quality during call',
    'Screen sharing (if available)',
    'Mute/unmute audio',
    'Turn camera on/off',
    'End call',
    'View call history',
    'Call duration tracking',
  ];

  videoTests.forEach(test => {
    doc.fontSize(10).text(`☐ ${test}`, { indent: 20 });
  });

  doc.moveDown(0.5);

  // Section 6: Media & Photos
  doc.fontSize(16).font('Helvetica-Bold').text('6. Media & Photos');
  doc.fontSize(11).font('Helvetica').moveDown(0.5);
  doc.text('Test photo upload and gallery features:');
  doc.moveDown(0.3);

  const mediaTests = [
    'Upload single photo',
    'Upload multiple photos',
    'Upload video',
    'View photo gallery',
    'Theater mode (full-screen)',
    'Zoom in/out on photo',
    'Delete photo',
    'Share photo in message',
    'Add photo to timeline',
    'View photo metadata',
    'Download photo',
  ];

  mediaTests.forEach(test => {
    doc.fontSize(10).text(`☐ ${test}`, { indent: 20 });
  });

  doc.addPage();

  // Section 7: Timeline & Memories
  doc.fontSize(16).font('Helvetica-Bold').text('7. Timeline & Memories');
  doc.fontSize(11).font('Helvetica').moveDown(0.5);
  doc.text('Test timeline and shared memories:');
  doc.moveDown(0.3);

  const timelineTests = [
    'Create timeline entry',
    'Add photos to timeline',
    'Add text to timeline',
    'View timeline chronologically',
    'Filter timeline by date',
    'Share timeline link',
    'Access shared timeline publicly',
    'Comment on timeline entry',
    'Like timeline entry',
    'Edit timeline entry',
    'Delete timeline entry',
  ];

  timelineTests.forEach(test => {
    doc.fontSize(10).text(`☐ ${test}`, { indent: 20 });
  });

  doc.moveDown(0.5);

  // Section 8: Organization Features
  doc.fontSize(16).font('Helvetica-Bold').text('8. Organization Features');
  doc.fontSize(11).font('Helvetica').moveDown(0.5);
  doc.text('Test events, announcements, and lists:');
  doc.moveDown(0.3);

  const orgTests = [
    'Create event',
    'Set event date and time',
    'Invite family members to event',
    'View calendar',
    'Create announcement',
    'Edit announcement',
    'Delete announcement',
    'Create shopping list',
    'Add items to list',
    'Check off items',
    'Share list with family',
    'View daily digest',
    'View weekly digest',
  ];

  orgTests.forEach(test => {
    doc.fontSize(10).text(`☐ ${test}`, { indent: 20 });
  });

  doc.moveDown(0.5);

  // Section 9: Settings & Preferences
  doc.fontSize(16).font('Helvetica-Bold').text('9. Settings & Preferences');
  doc.fontSize(11).font('Helvetica').moveDown(0.5);
  doc.text('Test user settings and preferences:');
  doc.moveDown(0.3);

  const settingsTests = [
    'Change language (if available)',
    'Update profile picture',
    'Edit profile information',
    'Change password',
    'Enable/disable notifications',
    'Set notification preferences',
    'Privacy settings',
    'Account deletion',
  ];

  settingsTests.forEach(test => {
    doc.fontSize(10).text(`☐ ${test}`, { indent: 20 });
  });

  doc.addPage();

  // Section 10: Admin Features
  doc.fontSize(16).font('Helvetica-Bold').text('10. Admin Features (Admin Users Only)');
  doc.fontSize(11).font('Helvetica').moveDown(0.5);
  doc.text('Test administrative functionality:');
  doc.moveDown(0.3);

  const adminTests = [
    'View families list',
    'View family details',
    'Manage family members',
    'View user accounts',
    'Suspend/unsuspend user',
    'View billing information',
    'Manage subscription plans',
    'View moderation queue',
    'Review flagged content',
    'View system logs',
  ];

  adminTests.forEach(test => {
    doc.fontSize(10).text(`☐ ${test}`, { indent: 20 });
  });

  doc.moveDown(0.5);

  // Section 11: Cross-Device Testing
  doc.fontSize(16).font('Helvetica-Bold').text('11. Cross-Device Testing');
  doc.fontSize(11).font('Helvetica').moveDown(0.5);
  doc.text('Test on multiple devices and browsers:');
  doc.moveDown(0.3);

  const deviceTests = [
    'Desktop (Chrome, Firefox, Safari, Edge)',
    'Tablet (iPad, Android tablet)',
    'Mobile (iPhone, Android phone)',
    'Responsive design on all screen sizes',
    'Touch interactions on mobile',
    'Landscape and portrait orientation',
  ];

  deviceTests.forEach(test => {
    doc.fontSize(10).text(`☐ ${test}`, { indent: 20 });
  });

  doc.moveDown(0.5);

  // Section 12: Performance & Edge Cases
  doc.fontSize(16).font('Helvetica-Bold').text('12. Performance & Edge Cases');
  doc.fontSize(11).font('Helvetica').moveDown(0.5);
  doc.text('Test performance and edge cases:');
  doc.moveDown(0.3);

  const performanceTests = [
    'Slow network (throttle to 3G)',
    'Offline behavior',
    'Large file uploads (100MB+)',
    'Long conversations (1000+ messages)',
    'Multiple simultaneous users',
    'Rapid clicking/interactions',
    'Browser back/forward navigation',
    'Session timeout',
    'Concurrent logins',
  ];

  performanceTests.forEach(test => {
    doc.fontSize(10).text(`☐ ${test}`, { indent: 20 });
  });

  doc.addPage();

  // Section 13: Bug Reporting
  doc.fontSize(16).font('Helvetica-Bold').text('13. Bug Reporting');
  doc.fontSize(11).font('Helvetica').moveDown(0.5);
  doc.text('When you find a bug, please report it with the following information:');
  doc.moveDown(0.5);

  doc.fontSize(10).font('Helvetica-Bold').text('Required Information:');
  const bugInfo = [
    'Bug Title: Clear, concise description',
    'Severity: Critical / High / Medium / Low',
    'Steps to Reproduce: Exact steps to trigger the bug',
    'Expected Behavior: What should happen',
    'Actual Behavior: What actually happened',
    'Screenshots/Video: Visual evidence',
    'Device & Browser: Device type, OS, browser version',
    'Account Used: Which test account',
    'Timestamp: When the bug occurred',
  ];

  bugInfo.forEach(info => {
    doc.fontSize(9).text(`• ${info}`, { indent: 20 });
  });

  doc.moveDown(1);
  doc.fontSize(10).font('Helvetica-Bold').text('Severity Levels:');
  doc.fontSize(9).text('Critical: App crashes, data loss, security issue', { indent: 20 });
  doc.fontSize(9).text('High: Feature doesn't work, major UX issue', { indent: 20 });
  doc.fontSize(9).text('Medium: Minor feature issue, workaround exists', { indent: 20 });
  doc.fontSize(9).text('Low: UI polish, typo, minor inconvenience', { indent: 20 });

  doc.moveDown(1);
  doc.fontSize(10).font('Helvetica-Bold').text('Report Bugs To:');
  doc.fontSize(10).text('Email: testing@familyconnect.app', { color: '#0066cc' });
  doc.text('Or use the in-app bug report button');

  doc.moveDown(2);
  doc.fontSize(9).fillColor('#666').text('Thank you for helping us improve Family Connect!', { align: 'center' });

  doc.end();
  console.log(`✅ Testing Guide created: ${filePath}`);
}

// ============================================
// QA CHECKLIST PDF
// ============================================
function generateQAChecklist() {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
  });

  const filePath = path.join(outputDir, 'QA-Checklist.pdf');
  doc.pipe(fs.createWriteStream(filePath));

  // Title
  doc.fontSize(24).font('Helvetica-Bold').text('Family Connect', { align: 'center' });
  doc.fontSize(12).font('Helvetica').text('QA Testing Checklist', { align: 'center' });
  doc.fontSize(9).fillColor('#666').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown(1.5);

  // Tester Info
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text('Tester Information');
  doc.fontSize(9).font('Helvetica');
  doc.text('Name: _________________________________     Date: _________________');
  doc.text('Device: ________________________________     Browser: _______________');
  doc.text('OS Version: ____________________________     App Version: ____________');
  doc.moveDown(1);

  // Feature Categories
  const categories = [
    {
      name: 'AUTHENTICATION & ONBOARDING',
      items: [
        { name: 'Sign Up', pass: false, fail: false, notes: '' },
        { name: 'Email Verification', pass: false, fail: false, notes: '' },
        { name: 'Login', pass: false, fail: false, notes: '' },
        { name: 'Password Reset', pass: false, fail: false, notes: '' },
        { name: 'Create First Family', pass: false, fail: false, notes: '' },
        { name: 'Profile Setup', pass: false, fail: false, notes: '' },
      ],
    },
    {
      name: 'FAMILY MANAGEMENT',
      items: [
        { name: 'Create Family', pass: false, fail: false, notes: '' },
        { name: 'Invite Members', pass: false, fail: false, notes: '' },
        { name: 'Accept Invitation', pass: false, fail: false, notes: '' },
        { name: 'Assign Roles', pass: false, fail: false, notes: '' },
        { name: 'Change Roles', pass: false, fail: false, notes: '' },
        { name: 'Remove Members', pass: false, fail: false, notes: '' },
        { name: 'View Members List', pass: false, fail: false, notes: '' },
      ],
    },
    {
      name: 'MESSAGING',
      items: [
        { name: 'Send Text Message', pass: false, fail: false, notes: '' },
        { name: 'Send with Emoji', pass: false, fail: false, notes: '' },
        { name: 'Send with Attachment', pass: false, fail: false, notes: '' },
        { name: 'Real-time Delivery', pass: false, fail: false, notes: '' },
        { name: 'Pin Message', pass: false, fail: false, notes: '' },
        { name: 'Archive Conversation', pass: false, fail: false, notes: '' },
        { name: 'Search Messages', pass: false, fail: false, notes: '' },
        { name: 'Delete Message', pass: false, fail: false, notes: '' },
      ],
    },
    {
      name: 'VIDEO CALLS',
      items: [
        { name: 'Initiate Call', pass: false, fail: false, notes: '' },
        { name: 'Receive Call', pass: false, fail: false, notes: '' },
        { name: 'Accept Call', pass: false, fail: false, notes: '' },
        { name: 'Audio Quality', pass: false, fail: false, notes: '' },
        { name: 'Video Quality', pass: false, fail: false, notes: '' },
        { name: 'Mute/Unmute', pass: false, fail: false, notes: '' },
        { name: 'End Call', pass: false, fail: false, notes: '' },
        { name: 'Call History', pass: false, fail: false, notes: '' },
      ],
    },
    {
      name: 'MEDIA & PHOTOS',
      items: [
        { name: 'Upload Photo', pass: false, fail: false, notes: '' },
        { name: 'Upload Multiple', pass: false, fail: false, notes: '' },
        { name: 'View Gallery', pass: false, fail: false, notes: '' },
        { name: 'Theater Mode', pass: false, fail: false, notes: '' },
        { name: 'Delete Photo', pass: false, fail: false, notes: '' },
        { name: 'Share Photo', pass: false, fail: false, notes: '' },
        { name: 'Download Photo', pass: false, fail: false, notes: '' },
      ],
    },
    {
      name: 'TIMELINE & MEMORIES',
      items: [
        { name: 'Create Entry', pass: false, fail: false, notes: '' },
        { name: 'Add Photos', pass: false, fail: false, notes: '' },
        { name: 'View Timeline', pass: false, fail: false, notes: '' },
        { name: 'Share Timeline Link', pass: false, fail: false, notes: '' },
        { name: 'Public Access', pass: false, fail: false, notes: '' },
        { name: 'Comment on Entry', pass: false, fail: false, notes: '' },
        { name: 'Edit Entry', pass: false, fail: false, notes: '' },
      ],
    },
    {
      name: 'ORGANIZATION',
      items: [
        { name: 'Create Event', pass: false, fail: false, notes: '' },
        { name: 'View Calendar', pass: false, fail: false, notes: '' },
        { name: 'Create Announcement', pass: false, fail: false, notes: '' },
        { name: 'Create Shopping List', pass: false, fail: false, notes: '' },
        { name: 'Add List Items', pass: false, fail: false, notes: '' },
        { name: 'View Digest', pass: false, fail: false, notes: '' },
      ],
    },
    {
      name: 'SETTINGS & PREFERENCES',
      items: [
        { name: 'Change Language', pass: false, fail: false, notes: '' },
        { name: 'Update Profile', pass: false, fail: false, notes: '' },
        { name: 'Change Password', pass: false, fail: false, notes: '' },
        { name: 'Notification Settings', pass: false, fail: false, notes: '' },
        { name: 'Privacy Settings', pass: false, fail: false, notes: '' },
      ],
    },
    {
      name: 'PERFORMANCE & EDGE CASES',
      items: [
        { name: 'Slow Network (3G)', pass: false, fail: false, notes: '' },
        { name: 'Offline Behavior', pass: false, fail: false, notes: '' },
        { name: 'Large File Upload', pass: false, fail: false, notes: '' },
        { name: 'Long Conversations', pass: false, fail: false, notes: '' },
        { name: 'Multiple Users', pass: false, fail: false, notes: '' },
        { name: 'Session Timeout', pass: false, fail: false, notes: '' },
      ],
    },
  ];

  categories.forEach((category, idx) => {
    if (idx > 0) doc.addPage();
    
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#0066cc').text(category.name);
    doc.moveDown(0.5);

    category.items.forEach((item, itemIdx) => {
      const yPos = doc.y;
      doc.fontSize(9).font('Helvetica').fillColor('#000');
      doc.text(`${itemIdx + 1}. ${item.name}`, { width: 250 });
      
      // Pass/Fail checkboxes
      doc.rect(doc.x + 260, yPos, 12, 12).stroke();
      doc.fontSize(8).text('PASS', doc.x + 275, yPos + 2);
      
      doc.rect(doc.x + 320, yPos, 12, 12).stroke();
      doc.fontSize(8).text('FAIL', doc.x + 335, yPos + 2);
      
      // Notes line
      doc.moveTo(doc.x, yPos + 20).lineTo(doc.x + 500, yPos + 20).stroke();
      
      doc.moveDown(1.2);
    });

    doc.moveDown(0.5);
  });

  // Summary Page
  doc.addPage();
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text('Testing Summary');
  doc.moveDown(1);

  doc.fontSize(10).font('Helvetica').text('Total Tests Passed: ________  /  Total Tests: ________');
  doc.text('Pass Rate: ________%');
  doc.moveDown(1);

  doc.fontSize(10).font('Helvetica-Bold').text('Critical Issues Found:');
  doc.fontSize(9).text('_________________________________________________________________');
  doc.text('_________________________________________________________________');
  doc.text('_________________________________________________________________');
  doc.moveDown(1);

  doc.fontSize(10).font('Helvetica-Bold').text('High Priority Issues:');
  doc.fontSize(9).text('_________________________________________________________________');
  doc.text('_________________________________________________________________');
  doc.moveDown(1);

  doc.fontSize(10).font('Helvetica-Bold').text('Medium Priority Issues:');
  doc.fontSize(9).text('_________________________________________________________________');
  doc.text('_________________________________________________________________');
  doc.moveDown(1);

  doc.fontSize(10).font('Helvetica-Bold').text('Overall Assessment:');
  doc.fontSize(9).text('☐ Ready for Release');
  doc.text('☐ Ready with Minor Fixes');
  doc.text('☐ Needs More Testing');
  doc.text('☐ Not Ready for Release');

  doc.moveDown(1);
  doc.fontSize(9).text('Tester Signature: ________________________     Date: ______________');

  doc.end();
  console.log(`✅ QA Checklist created: ${filePath}`);
}

// Generate both PDFs
generateTestingGuide();
generateQAChecklist();

console.log('\n✅ Both PDFs generated successfully!');
console.log(`📁 Location: ${outputDir}`);
