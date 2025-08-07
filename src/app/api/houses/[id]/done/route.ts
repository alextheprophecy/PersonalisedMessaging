import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid house ID' }, { status: 400 });
    }

    const body = await request.json();
    const done = !!body.done;
    
    // Convert boolean to number for SQLite (1 for true, 0 for false)
    const doneValue = done ? 1 : 0;

    const updateStmt = db.prepare('UPDATE scraped_data SET done = ? WHERE id = ?');
    const result = updateStmt.run(doneValue, id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'House not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, done });
  } catch (error) {
    console.error('Error updating done status:', error);
    return NextResponse.json({ error: 'Failed to update done status' }, { status: 500 });
  }
}
