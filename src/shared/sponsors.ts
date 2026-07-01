export interface Sponsor {
  id: string;
  name: string;
  image?: string;
  description?: string;
}

export async function loadSponsors(): Promise<Sponsor[]> {
  return [];
}
