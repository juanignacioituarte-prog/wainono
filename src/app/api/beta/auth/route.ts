import { NextResponse } from 'next/server';

// Temporary mock for Auth endpoint based on Google Sheet
export async function GET(request: Request) {
  // We provide a basic valid CSV that lets anyone be an admin for beta purposes
  // Or match the exact Google Sheet format
  const csv = `Email,Role
juanignacioituarte@gmail.com,admin
cha.adrian94@gmail.com,admin
`;
  return new NextResponse(csv, { 
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'text/csv'
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    }
  });
}
