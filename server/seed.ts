import { db } from "./db";
import { cities, districts, developers, banks, projects, developerBanks, projectBanks } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const existingCities = await db.select().from(cities).limit(1);
  if (existingCities.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database...");

  const cityData = [
    { name: "New York" },
    { name: "Los Angeles" },
    { name: "Miami" },
    { name: "Chicago" },
    { name: "San Francisco" },
  ];
  const insertedCities = await db.insert(cities).values(cityData).returning();

  const districtData = [
    { name: "Manhattan", cityId: insertedCities[0].id },
    { name: "Brooklyn", cityId: insertedCities[0].id },
    { name: "Queens", cityId: insertedCities[0].id },
    { name: "Downtown LA", cityId: insertedCities[1].id },
    { name: "Beverly Hills", cityId: insertedCities[1].id },
    { name: "Santa Monica", cityId: insertedCities[1].id },
    { name: "Miami Beach", cityId: insertedCities[2].id },
    { name: "Brickell", cityId: insertedCities[2].id },
    { name: "Wynwood", cityId: insertedCities[2].id },
    { name: "The Loop", cityId: insertedCities[3].id },
    { name: "River North", cityId: insertedCities[3].id },
    { name: "SOMA", cityId: insertedCities[4].id },
    { name: "Mission District", cityId: insertedCities[4].id },
  ];
  const insertedDistricts = await db.insert(districts).values(districtData).returning();

  const developerData = [
    { name: "Skyline Developers", description: "Premier luxury real estate developer with 25 years of experience in creating iconic residential towers.", logoUrl: null },
    { name: "Urban Living Group", description: "Innovative developer focused on sustainable urban living spaces in major metropolitan areas.", logoUrl: null },
    { name: "Coastal Properties Inc", description: "Specialists in waterfront and coastal luxury developments across the United States.", logoUrl: null },
    { name: "Metro Homes", description: "Building quality homes for families since 1990, with over 10,000 units delivered.", logoUrl: null },
    { name: "Apex Development Co", description: "Cutting-edge mixed-use developments that blend residential, commercial, and retail spaces.", logoUrl: null },
    { name: "Horizon Estates", description: "Creating exclusive residential communities with world-class amenities and services.", logoUrl: null },
  ];
  const insertedDevelopers = await db.insert(developers).values(developerData).returning();

  const bankData = [
    { name: "First National Bank", description: "Leading mortgage provider with competitive rates and flexible terms for new developments.", logoUrl: null },
    { name: "City Trust Bank", description: "Specialized in real estate financing with tailored solutions for homebuyers.", logoUrl: null },
    { name: "Pacific Mortgage Corp", description: "West coast's premier mortgage lender with 30+ years of experience.", logoUrl: null },
    { name: "American Home Finance", description: "Nationwide mortgage services with fast approvals and excellent customer support.", logoUrl: null },
    { name: "Coastal Credit Union", description: "Member-owned financial institution offering competitive home loan products.", logoUrl: null },
  ];
  const insertedBanks = await db.insert(banks).values(bankData).returning();

  const devBankRelations = [
    { developerId: insertedDevelopers[0].id, bankId: insertedBanks[0].id },
    { developerId: insertedDevelopers[0].id, bankId: insertedBanks[1].id },
    { developerId: insertedDevelopers[1].id, bankId: insertedBanks[1].id },
    { developerId: insertedDevelopers[1].id, bankId: insertedBanks[2].id },
    { developerId: insertedDevelopers[2].id, bankId: insertedBanks[2].id },
    { developerId: insertedDevelopers[2].id, bankId: insertedBanks[4].id },
    { developerId: insertedDevelopers[3].id, bankId: insertedBanks[0].id },
    { developerId: insertedDevelopers[3].id, bankId: insertedBanks[3].id },
    { developerId: insertedDevelopers[4].id, bankId: insertedBanks[1].id },
    { developerId: insertedDevelopers[4].id, bankId: insertedBanks[3].id },
    { developerId: insertedDevelopers[5].id, bankId: insertedBanks[0].id },
    { developerId: insertedDevelopers[5].id, bankId: insertedBanks[4].id },
  ];
  await db.insert(developerBanks).values(devBankRelations);

  const projectData = [
    {
      name: "The Manhattan Tower",
      developerId: insertedDevelopers[0].id,
      cityId: insertedCities[0].id,
      districtId: insertedDistricts[0].id,
      latitude: 40.7580,
      longitude: -73.9855,
      address: "350 5th Avenue, New York, NY 10118",
      shortDescription: "Luxury condominiums in the heart of Midtown Manhattan with stunning city views.",
      description: "Experience elevated living at The Manhattan Tower, a prestigious 60-story residential development offering unparalleled views of the New York City skyline. Each residence features floor-to-ceiling windows, premium finishes, and smart home technology.\n\nAmenities include a rooftop infinity pool, state-of-the-art fitness center, private dining room, and 24/7 concierge services.",
      coverImageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
      priceFrom: 1500000,
      currency: "USD",
      completionDate: new Date("2025-06-01"),
    },
    {
      name: "Brooklyn Heights Residences",
      developerId: insertedDevelopers[1].id,
      cityId: insertedCities[0].id,
      districtId: insertedDistricts[1].id,
      latitude: 40.6960,
      longitude: -73.9936,
      address: "100 Montague Street, Brooklyn, NY 11201",
      shortDescription: "Modern sustainable apartments with eco-friendly features and Manhattan views.",
      description: "Brooklyn Heights Residences combines modern luxury with sustainable living. This LEED Gold certified building features solar panels, green roofs, and energy-efficient systems throughout.\n\nResidents enjoy a rooftop garden, electric vehicle charging stations, bike storage, and a community lounge with co-working spaces.",
      coverImageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800",
      priceFrom: 850000,
      currency: "USD",
      completionDate: new Date("2025-03-15"),
    },
    {
      name: "Pacific View Towers",
      developerId: insertedDevelopers[2].id,
      cityId: insertedCities[1].id,
      districtId: insertedDistricts[5].id,
      latitude: 34.0195,
      longitude: -118.4912,
      address: "1500 Ocean Avenue, Santa Monica, CA 90401",
      shortDescription: "Oceanfront luxury condos with direct beach access and panoramic Pacific views.",
      description: "Wake up to breathtaking Pacific Ocean views at Pacific View Towers. This exclusive beachfront development offers 48 luxury residences ranging from 2 to 5 bedrooms.\n\nEnjoy private beach access, an infinity pool overlooking the ocean, spa facilities, and a private residents' club with chef's kitchen.",
      coverImageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
      priceFrom: 2800000,
      currency: "USD",
      completionDate: new Date("2025-09-01"),
    },
    {
      name: "Beverly Hills Estate Collection",
      developerId: insertedDevelopers[5].id,
      cityId: insertedCities[1].id,
      districtId: insertedDistricts[4].id,
      latitude: 34.0736,
      longitude: -118.4004,
      address: "9500 Wilshire Boulevard, Beverly Hills, CA 90212",
      shortDescription: "Ultra-luxury estates in the most prestigious neighborhood of Los Angeles.",
      description: "The Beverly Hills Estate Collection represents the pinnacle of luxury living in Los Angeles. These meticulously designed single-family estates feature 6-8 bedrooms, private pools, home theaters, and wine cellars.\n\nEach estate includes smart home automation, professional-grade kitchens, and landscaped gardens designed by renowned architects.",
      coverImageUrl: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
      priceFrom: 15000000,
      currency: "USD",
      completionDate: new Date("2026-01-15"),
    },
    {
      name: "Brickell Bay Residences",
      developerId: insertedDevelopers[2].id,
      cityId: insertedCities[2].id,
      districtId: insertedDistricts[7].id,
      latitude: 25.7617,
      longitude: -80.1918,
      address: "1200 Brickell Avenue, Miami, FL 33131",
      shortDescription: "Waterfront luxury in Miami's most dynamic urban neighborhood.",
      description: "Brickell Bay Residences offers the ultimate Miami lifestyle with stunning Biscayne Bay views and immediate access to world-class dining, shopping, and entertainment.\n\nThe 52-story tower features a resort-style pool deck, private marina, spa, and multiple restaurants exclusive to residents.",
      coverImageUrl: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
      priceFrom: 950000,
      currency: "USD",
      completionDate: new Date("2025-04-30"),
    },
    {
      name: "Miami Beach Oceanfront",
      developerId: insertedDevelopers[3].id,
      cityId: insertedCities[2].id,
      districtId: insertedDistricts[6].id,
      latitude: 25.7907,
      longitude: -80.1300,
      address: "3200 Collins Avenue, Miami Beach, FL 33140",
      shortDescription: "Art Deco-inspired beachfront condominiums with private beach club.",
      description: "Miami Beach Oceanfront pays homage to the area's rich Art Deco heritage while offering all the modern amenities expected of a luxury development.\n\nResidences feature oversized terraces, beach views, and access to a private beach club, oceanfront restaurant, and full-service spa.",
      coverImageUrl: "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=800",
      priceFrom: 1200000,
      currency: "USD",
      completionDate: new Date("2025-07-01"),
    },
    {
      name: "The Loop Lofts",
      developerId: insertedDevelopers[4].id,
      cityId: insertedCities[3].id,
      districtId: insertedDistricts[9].id,
      latitude: 41.8819,
      longitude: -87.6278,
      address: "333 N Michigan Avenue, Chicago, IL 60601",
      shortDescription: "Industrial-chic lofts in Chicago's iconic downtown district.",
      description: "The Loop Lofts transforms a historic Chicago landmark into stunning modern residences. Each loft features exposed brick, high ceilings, oversized windows, and premium finishes.\n\nAmenities include a rooftop deck with skyline views, fitness center, dog run, and direct access to the Chicago Riverwalk.",
      coverImageUrl: "https://images.unsplash.com/photo-1565182999561-18d7dc61c393?w=800",
      priceFrom: 650000,
      currency: "USD",
      completionDate: new Date("2025-02-28"),
    },
    {
      name: "River North Collection",
      developerId: insertedDevelopers[0].id,
      cityId: insertedCities[3].id,
      districtId: insertedDistricts[10].id,
      latitude: 41.8903,
      longitude: -87.6341,
      address: "500 N Clark Street, Chicago, IL 60654",
      shortDescription: "Contemporary luxury apartments in Chicago's art and gallery district.",
      description: "River North Collection brings refined urban living to one of Chicago's most vibrant neighborhoods. Surrounded by world-class restaurants, galleries, and nightlife.\n\nResidences feature designer kitchens, spa-inspired bathrooms, and floor-to-ceiling windows. Building amenities include a pool, sundeck, and private resident lounge.",
      coverImageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
      priceFrom: 750000,
      currency: "USD",
      completionDate: new Date("2025-05-15"),
    },
    {
      name: "SOMA Tech Tower",
      developerId: insertedDevelopers[4].id,
      cityId: insertedCities[4].id,
      districtId: insertedDistricts[11].id,
      latitude: 37.7749,
      longitude: -122.4194,
      address: "888 Howard Street, San Francisco, CA 94103",
      shortDescription: "Smart homes designed for the tech-savvy urban professional.",
      description: "SOMA Tech Tower is designed from the ground up for the modern technology professional. Every residence features integrated smart home systems, fiber internet, and dedicated home office spaces.\n\nBuilding amenities include a co-working lounge, podcast studios, maker space, and a rooftop entertainment deck.",
      coverImageUrl: "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=800",
      priceFrom: 1100000,
      currency: "USD",
      completionDate: new Date("2025-08-01"),
    },
    {
      name: "Mission District Studios",
      developerId: insertedDevelopers[1].id,
      cityId: insertedCities[4].id,
      districtId: insertedDistricts[12].id,
      latitude: 37.7599,
      longitude: -122.4148,
      address: "2400 Mission Street, San Francisco, CA 94110",
      shortDescription: "Artist-inspired live/work spaces in San Francisco's cultural heart.",
      description: "Mission District Studios celebrates the creative spirit of San Francisco's most colorful neighborhood. These live/work spaces are perfect for artists, creators, and entrepreneurs.\n\nFeatures include high ceilings, north-facing windows for natural light, and flexible floor plans. Community spaces include a gallery, event space, and rooftop garden.",
      coverImageUrl: "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=800",
      priceFrom: 580000,
      currency: "USD",
      completionDate: new Date("2025-04-01"),
    },
    {
      name: "Queens Waterfront",
      developerId: insertedDevelopers[3].id,
      cityId: insertedCities[0].id,
      districtId: insertedDistricts[2].id,
      latitude: 40.7282,
      longitude: -73.9942,
      address: "4545 Center Boulevard, Long Island City, NY 11109",
      shortDescription: "Family-friendly waterfront community with spectacular Manhattan views.",
      description: "Queens Waterfront offers exceptional value with stunning Manhattan skyline views. This family-oriented development features spacious 2-4 bedroom residences.\n\nAmenities include a waterfront promenade, children's playroom, tennis courts, and a community center. Steps from ferry service to Manhattan.",
      coverImageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
      priceFrom: 720000,
      currency: "USD",
      completionDate: new Date("2025-06-15"),
    },
    {
      name: "Wynwood Arts Residences",
      developerId: insertedDevelopers[1].id,
      cityId: insertedCities[2].id,
      districtId: insertedDistricts[8].id,
      latitude: 25.8003,
      longitude: -80.1997,
      address: "2600 NW 2nd Avenue, Miami, FL 33127",
      shortDescription: "Art-forward living in Miami's premier arts and design district.",
      description: "Wynwood Arts Residences brings a new standard of creative living to Miami's world-famous arts district. The building facade features rotating murals by renowned street artists.\n\nInteriors showcase local artwork and feature gallery-quality lighting. Residents enjoy a sculpture garden, art studio, and partnerships with local galleries.",
      coverImageUrl: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800",
      priceFrom: 680000,
      currency: "USD",
      completionDate: new Date("2025-10-01"),
    },
  ];
  
  const insertedProjects = await db.insert(projects).values(projectData).returning();

  const projBankRelations = [
    { projectId: insertedProjects[0].id, bankId: insertedBanks[0].id },
    { projectId: insertedProjects[0].id, bankId: insertedBanks[1].id },
    { projectId: insertedProjects[1].id, bankId: insertedBanks[1].id },
    { projectId: insertedProjects[2].id, bankId: insertedBanks[2].id },
    { projectId: insertedProjects[2].id, bankId: insertedBanks[4].id },
    { projectId: insertedProjects[3].id, bankId: insertedBanks[0].id },
    { projectId: insertedProjects[4].id, bankId: insertedBanks[2].id },
    { projectId: insertedProjects[5].id, bankId: insertedBanks[0].id },
    { projectId: insertedProjects[5].id, bankId: insertedBanks[3].id },
    { projectId: insertedProjects[6].id, bankId: insertedBanks[1].id },
    { projectId: insertedProjects[7].id, bankId: insertedBanks[0].id },
    { projectId: insertedProjects[8].id, bankId: insertedBanks[1].id },
    { projectId: insertedProjects[8].id, bankId: insertedBanks[3].id },
    { projectId: insertedProjects[9].id, bankId: insertedBanks[1].id },
    { projectId: insertedProjects[10].id, bankId: insertedBanks[0].id },
    { projectId: insertedProjects[11].id, bankId: insertedBanks[1].id },
  ];
  await db.insert(projectBanks).values(projBankRelations);

  console.log("Database seeded successfully!");
  console.log(`Created: ${insertedCities.length} cities, ${insertedDistricts.length} districts, ${insertedDevelopers.length} developers, ${insertedBanks.length} banks, ${insertedProjects.length} projects`);
}
