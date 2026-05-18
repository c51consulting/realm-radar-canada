/** Quick local sanity for slug parsers — run with: npx tsx scripts/test-parsers.ts */
import { parsePurplewave, parseCattlerange } from '../lib/parseListingUrl';

const pwCases = [
  'https://www.purplewave.com/auction/260610/item/EA4751/Trebro-Autostack-Harvesters-Specialty_Crop_Harvester-Wisconsin',
  'https://www.purplewave.com/auction/260527/item/MX9100/R&R-Grain_or_Fertilizer_Handling-Auger_or_Conveyor-Kansas',
  'https://www.purplewave.com/auction/260528/item/YA3118/2003-Trailmobile-Trailers-Dry_Van_Trailer-Illinois',
  'https://www.purplewave.com/auction/260528/item/ET6036/2013-Peterbilt-365-Trucks-Truck_Tractor-Oklahoma',
  'https://www.purplewave.com/auction/260528/item/EU8654/Trailers-Trailer_Other-Idaho',
  'https://www.purplewave.com/auction/260527/item/FK0114/Woods-TC74B06-Tillage_Equipment-Rotary_Tillage-Minnesota',
  'https://www.purplewave.com/auction/260520/item/FC5454/2013-Chrysler-Town_And_Country-Passenger_Vehicles-Passenger_Vehicle-Missouri',
  'https://www.purplewave.com/auction/260528/item/EU5509/2010-Great_Dane_Trailers-Trailers-Dry_Van_Trailer-Texas',
];

const crCases = [
  'https://www.cattlerange.com/listings/2026/01/2-reg-akaushi-bulls-northeast-tx/',
  'https://www.cattlerange.com/listings/2026/01/6-f1-brangus-rep-heifers-south-tx/',
  'https://www.cattlerange.com/listings/2026/01/24-angus-hereford-cows-w-3-calves-central-tx/',
  'https://www.cattlerange.com/listings/2026/01/35-beefmaster-beefmaster-cross-rep-heifers-south-tx/',
  'https://www.cattlerange.com/listings/2024/10/45-angus-angus-cross-cows-northeast-tx/',
];

console.log('--- Purplewave ---');
for (const u of pwCases) console.log(JSON.stringify(parsePurplewave(u)), '<-', u.split('/').pop());

console.log('\n--- Cattlerange ---');
for (const u of crCases) console.log(JSON.stringify(parseCattlerange(u)), '<-', u.split('/').filter(Boolean).pop());
