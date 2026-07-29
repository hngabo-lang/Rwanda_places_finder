// frontend logic that talks to my own backend only, so the API key stays hidden. also handles the filter
// and sort dropdowns without needing to search again each time.

const srchForm = document.getElementById('finder-form');
const qeryInput = document.getElementById('what-input');
const nearInput = document.getElementById('where-input');
const catgoryFilter = document.getElementById('type-filter');
const sortPicker = document.getElementById('order-select');
const risaltsList = document.getElementById('spot-list');
const statsMessage = document.getElementById('msg-box');

let savedSearch = []; // holds the last search results so filtering/sorting doesn't need a new request

function tellUser(message, isError) {
  statsMessage.textContent = message;
  statsMessage.style.color = isError ? '#a83232' : '#1e3a5f';
}

// turns raw meters into something readable like "1.2km away"
function distanceLabel(meters) {
  if (meters == null) return '';
  if (meters < 1000) return meters + 'm away';
  return (meters / 1000).toFixed(1) + 'km away';
}

function showPlacesOnPage(spots) {
  risaltsList.innerHTML = '';

  if (spots.length === 0) {
    risaltsList.innerHTML = '<p>Nothing found. Try a different search.</p>';
    return;
  }

  for (const spot of spots) {
    const card = document.createElement('div');
    card.className = 'place-card';
    card.innerHTML =
      '<h3>' + spot.name + '</h3>' +
      '<div class="place-meta">' +
        (spot.categories.join(', ') || 'Uncategorized') + ' &middot; ' + spot.address +
        (spot.distance != null ? ' &middot; ' + distanceLabel(spot.distance) : '') +
      '</div>';
    risaltsList.appendChild(card);
  }
}

// fills the category dropdown based on whatever categories showed up in this search
function buildCategoryDropdown(spots) {
  const categoryNames = [...new Set(spots.flatMap((s) => s.categories))].sort();
  const previousChoice = catgoryFilter.value;

  catgoryFilter.innerHTML = '<option value="">All</option>';
  for (const name of categoryNames) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    catgoryFilter.appendChild(option);
  }
  catgoryFilter.value = previousChoice;
}

// re-filters and re-sorts whatever is already in savedSearch, no new API call needed
function updateVisibleList() {
  let spots = savedSearch.slice();

  if (catgoryFilter.value) {
    spots = spots.filter((s) => s.categories.includes(catgoryFilter.value));
  }

  if (sortPicker.value === 'distance') {
    spots.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
  } else {
    spots.sort((a, b) => a.name.localeCompare(b.name));
  }

  showPlacesOnPage(spots);
}

catgoryFilter.addEventListener('change', updateVisibleList);
sortPicker.addEventListener('change', updateVisibleList);

srchForm.addEventListener('submit', async (event) => {
  event.preventDefault(); // stop the page from refreshing on submit

  const typedQuery = qeryInput.value.trim();
  const typedArea = nearInput.value.trim();

  tellUser('Searching...', false);
  risaltsList.innerHTML = '';

  try {
    const response = await fetch('/api/places?query=' + encodeURIComponent(typedQuery) + '&near=' + encodeURIComponent(typedArea));
    const data = await response.json();

    if (!response.ok) {
      tellUser(data.error || 'Something went wrong.', true);
      return;
    }

    savedSearch = data.places;
    tellUser('Found ' + data.count + ' places near ' + typedArea + '.', false);
    buildCategoryDropdown(savedSearch);
    updateVisibleList();

  } catch (err) {
    console.log(err);
    tellUser('Can not reach the server. Check your connection.', true);
  }
});
