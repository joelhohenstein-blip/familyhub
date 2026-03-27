import fs from 'fs';
import path from 'path';
import type { LoaderFunctionArgs } from 'react-router';

/**
 * API endpoint for accessing documentation files
 * GET /api/docs/[filename] - Returns the documentation file
 * GET /api/docs - Returns list of available documentation files
 */
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const pathname = url.pathname.replace('/api/docs/', '').replace('/api/docs', '');

  // List all available docs
  if (!pathname || pathname === '') {
    const docsDir = path.join(process.cwd(), 'public', 'docs');
    try {
      const files = fs.readdirSync(docsDir);
      const docs = files
        .filter(f => f.endsWith('.md'))
        .map(f => ({
          name: f,
          path: `/api/docs/${f}`,
          downloadUrl: `/docs/${f}`,
          size: fs.statSync(path.join(docsDir, f)).size
        }));

      return Response.json({
        success: true,
        count: docs.length,
        docs
      });
    } catch (error) {
      return Response.json(
        { success: false, error: 'Failed to read documentation directory' },
        { status: 500 }
      );
    }
  }

  // Get specific documentation file
  const filename = pathname.split('/').pop();
  if (!filename || !filename.endsWith('.md')) {
    return Response.json(
      { success: false, error: 'Invalid filename' },
      { status: 400 }
    );
  }

  // Security: prevent directory traversal
  if (filename.includes('..') || filename.includes('/')) {
    return Response.json(
      { success: false, error: 'Invalid filename' },
      { status: 400 }
    );
  }

  const filePath = path.join(process.cwd(), 'public', 'docs', filename);

  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return Response.json(
        { success: false, error: 'Documentation file not found' },
        { status: 404 }
      );
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const stats = fs.statSync(filePath);

    return Response.json({
      success: true,
      filename,
      size: stats.size,
      lastModified: stats.mtime,
      content
    });
  } catch (error) {
    return Response.json(
      { success: false, error: 'Failed to read documentation file' },
      { status: 500 }
    );
  }
};
