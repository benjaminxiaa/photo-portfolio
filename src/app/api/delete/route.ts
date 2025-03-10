// src/app/api/delete/route.ts
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { src, category } = body;
    
    console.log('API Delete: Starting mock delete operation');
    console.log('API Delete: Image source:', src);
    console.log('API Delete: Category:', category);
    
    // Basic validation
    if (!src) {
      console.log('API Delete: Missing image source');
      return NextResponse.json(
        { success: false, message: 'Image source is required' },
        { status: 400 }
      );
    }
    
    if (!category) {
      console.log('API Delete: Missing category');
      return NextResponse.json(
        { success: false, message: 'Category is required' },
        { status: 400 }
      );
    }
    
    // Validate category
    const validCategories = ['nature', 'wildlife', 'architecture', 'travel'];
    if (!validCategories.includes(category)) {
      console.log('API Delete: Invalid category:', category);
      return NextResponse.json(
        { success: false, message: 'Invalid category' },
        { status: 400 }
      );
    }
    
    // In Edge runtime, we can't modify files
    // This is a mock response that pretends the operation was successful
    
    console.log('API Delete: Mock operation completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Image reference removed successfully (mock - Edge runtime)'
    });
  } catch (error) {
    console.error('API Delete: Unhandled error:', error);
    return NextResponse.json(
      { success: false, message: `Error removing image reference: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}