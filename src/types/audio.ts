// ★ Audio Types (shared between client and server)
// This file has NO 'use client' or 'use server' - can be used anywhere

export interface AudioRequest {
    required: boolean;
    prompt: string;
    duration_seconds: number;
}

export interface AudioDirectorResult {
    context_summary: string;
    sfx?: AudioRequest;
    bgm?: AudioRequest;
}
