import { NextResponse } from "next/server"; import { signOut } from "@/application/services/auth-service"; export async function POST(){await signOut();return NextResponse.json({ok:true});}
