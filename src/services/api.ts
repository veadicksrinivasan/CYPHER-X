import type { BlastRadiusRequest, BlastRadiusResponse } from '@/types/blastRadius';

/**
 * Calls the backend Blast Radius simulation API.
 * @param payload request payload matching the backend model
 * @returns the parsed JSON response
 */
export async function blastRadiusSimulate(payload: BlastRadiusRequest): Promise<BlastRadiusResponse> {
  const response = await fetch('http://localhost:8080/api/blast-radius/simulate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Blast radius simulation failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as BlastRadiusResponse;
  return data;
}

