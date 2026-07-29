// handles calls to the Foursquare Places API. kept this in its own file
// so server.js stays short, and so my API key never has to touch any
// frontend code.

const express = require('express');
const louter = express.Router();

const API_KEY = process.env.FOURSQUARE_API_KEY;
const BASE_URL = 'https://places-api.foursquare.com/places/search';
const API_VERSION = '2025-06-17';

// Foursquare's newer API wants a latitude/longitude instead of a place
// name, so this is just a small list of coordinates for a few towns in
// Rwanda. anything not on this list just defaults to Kigali.
const lokations = {
  kigali: { lat: -1.9441, lng: 30.0619 },
  huye: { lat: -2.5967, lng: 29.7392 },
  musanze: { lat: -1.4996, lng: 29.6337 },
  rubavu: { lat: -1.6791, lng: 29.2661 },
  muhanga: { lat: -2.0838, lng: 29.7563 },
  rwamagana: { lat: -1.9487, lng: 30.4347 }
};

function getCoordinates(areaNme) {
  const sarch = areaNme.toLowerCase().trim();
  const found = Object.keys(lokations).find((town) => sarch.includes(town));
  return found ? lokations[found] : lokations.kigali;
}

// GET /api/places?query=restaurant&near=Kigali
louter.get('/', async (req, res) => {
  // req.query is set by Express itself, so that part has to stay as-is
  const qery = (req.query.query || '').trim();
  const near = (req.query.near || 'Kigali').trim();

  // don't even bother calling the API if the input looks off
  if (qery.length > 100 || near.length > 100) {
    return res.status(400).json({ error: 'That search looks too long, try something shorter.' });
  }

  const coordns = getCoordinates(near);

  const params = new URLSearchParams({
    ll: `${coordns.lat},${coordns.lng}`,
    radius: '5000',
    limit: '30'
  });
  if (qery) {
    params.set('query', qery);
  }

  try {
    const response = await fetch(`${BASE_URL}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: 'application/json',
        'X-Places-Api-Version': API_VERSION
      }
    });

    if (!response.ok) {
      console.log('Foursquare returned an error status:', response.status);
      return res.status(502).json({ error: 'The places search is not responding right now. Try again in a bit.' });
    }

    const data = await response.json();

    // pulling out just the fields the frontend actually needs
    const placs = (data.results || []).map((place) => ({
      id: place.fsq_place_id || place.fsq_id,
      name: place.name,
      address: place.location ? place.location.formatted_address : 'No address found',
      categories: (place.categories || []).map((c) => c.name),
      distance: place.distance || null
    }));

    res.json({ places: placs, count: placs.length });

  } catch (err) {
    console.log('Something went wrong while calling Foursquare:', err.message);
    res.status(500).json({ error: 'Could not reach the places service. Check your connection and try again.' });
  }
});

module.exports = louter;
