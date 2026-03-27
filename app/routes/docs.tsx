import React from 'react';
import { Link } from 'react-router';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';

export default function DocsPage() {
  const documentationFiles = [
    {
      title: 'Complete Documentation',
      description: 'Comprehensive guide covering everything about FamilyHub',
      file: 'FAMILYHUB_COMPLETE_DOCUMENTATION.md',
      size: '~32 KB',
      icon: '📚',
      color: 'bg-blue-50 border-blue-200'
    },
    {
      title: 'README',
      description: 'Project overview and quick start guide',
      file: 'README.md',
      size: '~8 KB',
      icon: '📖',
      color: 'bg-green-50 border-green-200'
    },
    {
      title: 'Comprehensive README',
      description: 'Detailed project documentation with architecture',
      file: 'README_COMPREHENSIVE.md',
      size: '~12 KB',
      icon: '📋',
      color: 'bg-purple-50 border-purple-200'
    },
    {
      title: 'Technical Summary',
      description: 'Technical architecture and implementation details',
      file: 'TECHNICAL_SUMMARY.md',
      size: '~11 KB',
      icon: '⚙️',
      color: 'bg-orange-50 border-orange-200'
    },
    {
      title: 'API Documentation',
      description: 'Complete API reference and endpoint documentation',
      file: 'API_DOCUMENTATION_README.md',
      size: '~8 KB',
      icon: '🔌',
      color: 'bg-red-50 border-red-200'
    },
    {
      title: 'Deployment Guide',
      description: 'Instructions for deploying FamilyHub to production',
      file: 'DEPLOYMENT_GUIDE.md',
      size: '~10 KB',
      icon: '🚀',
      color: 'bg-indigo-50 border-indigo-200'
    },
    {
      title: 'Developer Setup',
      description: 'Local development environment setup instructions',
      file: 'DEVELOPER_SETUP.md',
      size: '~6 KB',
      icon: '💻',
      color: 'bg-cyan-50 border-cyan-200'
    },
    {
      title: 'Database Schema',
      description: 'Database tables, relationships, and schema documentation',
      file: 'DATABASE_SCHEMA.md',
      size: '~9 KB',
      icon: '🗄️',
      color: 'bg-pink-50 border-pink-200'
    }
  ];

  const handleDownload = (filename: string) => {
    // Create a link to download the file from the public directory
    const link = document.createElement('a');
    link.href = `/docs/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">📚 FamilyHub Documentation</h1>
              <p className="text-slate-600 mt-2">Complete guides, API reference, and deployment instructions</p>
            </div>
            <Link to="/dashboard">
              <Button variant="outline">Back to App</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Documentation Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">8</div>
              <p className="text-xs text-slate-500 mt-1">Complete guides available</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">~64 KB</div>
              <p className="text-xs text-slate-500 mt-1">All documentation combined</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">API Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">50+</div>
              <p className="text-xs text-slate-500 mt-1">Fully documented</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">✅</div>
              <p className="text-xs text-slate-500 mt-1">Production ready</p>
            </CardContent>
          </Card>
        </div>

        {/* Documentation Files Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Available Documentation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documentationFiles.map((doc, index) => (
              <Card key={index} className={`border-2 ${doc.color} hover:shadow-lg transition-shadow`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="text-4xl">{doc.icon}</div>
                    <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded">
                      {doc.size}
                    </span>
                  </div>
                  <CardTitle className="mt-4">{doc.title}</CardTitle>
                  <CardDescription>{doc.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDownload(doc.file)}
                    >
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        // Open in new tab
                        window.open(`/docs/${doc.file}`, '_blank');
                      }}
                    >
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="bg-white rounded-lg border border-slate-200 p-8 mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Getting Started</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-blue-600 hover:underline">
                    → Local Development Setup
                  </a>
                </li>
                <li>
                  <a href="#" className="text-blue-600 hover:underline">
                    → Environment Variables
                  </a>
                </li>
                <li>
                  <a href="#" className="text-blue-600 hover:underline">
                    → Running Tests
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Deployment</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-blue-600 hover:underline">
                    → Deploy to Railway
                  </a>
                </li>
                <li>
                  <a href="#" className="text-blue-600 hover:underline">
                    → Environment Configuration
                  </a>
                </li>
                <li>
                  <a href="#" className="text-blue-600 hover:underline">
                    → Monitoring & Logs
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">API & Development</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-blue-600 hover:underline">
                    → API Endpoints Reference
                  </a>
                </li>
                <li>
                  <a href="#" className="text-blue-600 hover:underline">
                    → Database Schema
                  </a>
                </li>
                <li>
                  <a href="#" className="text-blue-600 hover:underline">
                    → Code Style Guide
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Support</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-blue-600 hover:underline">
                    → Troubleshooting Guide
                  </a>
                </li>
                <li>
                  <a href="#" className="text-blue-600 hover:underline">
                    → Common Issues
                  </a>
                </li>
                <li>
                  <a href="#" className="text-blue-600 hover:underline">
                    → Contact Support
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Features Overview */}
        <div className="bg-white rounded-lg border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">FamilyHub Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '💬', title: 'Messaging', desc: 'Threaded conversations & 1-on-1 chat' },
              { icon: '🎥', title: 'Video Calls', desc: 'Group and 1-on-1 video calling' },
              { icon: '📸', title: 'Media Gallery', desc: 'Photo & video sharing with tagging' },
              { icon: '📅', title: 'Calendar', desc: 'Event management & coordination' },
              { icon: '🛒', title: 'Shopping Lists', desc: 'Shared lists with assignments' },
              { icon: '🤖', title: 'AI Features', desc: 'Summaries, suggestions & tagging' },
              { icon: '🎬', title: 'Streaming', desc: 'Integrated entertainment services' },
              { icon: '🌍', title: 'Multi-language', desc: 'English, Spanish, French' },
              { icon: '🔒', title: 'Security', desc: 'Encryption & privacy-first design' }
            ].map((feature, index) => (
              <div key={index} className="flex gap-4">
                <div className="text-3xl">{feature.icon}</div>
                <div>
                  <h3 className="font-semibold text-slate-900">{feature.title}</h3>
                  <p className="text-sm text-slate-600">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-900 text-white mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4">Documentation</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li><a href="#" className="hover:text-white">Complete Guide</a></li>
                <li><a href="#" className="hover:text-white">API Reference</a></li>
                <li><a href="#" className="hover:text-white">Deployment</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li><a href="#" className="hover:text-white">GitHub</a></li>
                <li><a href="#" className="hover:text-white">Issues</a></li>
                <li><a href="#" className="hover:text-white">Discussions</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li><a href="mailto:support@familyhub.app" className="hover:text-white">Email Support</a></li>
                <li><a href="#" className="hover:text-white">Live Chat</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 text-center text-sm text-slate-400">
            <p>© 2026 FamilyHub. All rights reserved. | <a href="#" className="hover:text-white">Privacy Policy</a> | <a href="#" className="hover:text-white">Terms of Service</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
