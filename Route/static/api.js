const SERVELEGAL = 'https://www.secure-servelegal.co.uk';
const LOCAL = '';
const HOLIDAY_RATE = 1.12;
const MILEAGE = 0.22;

function sl(path) {
  const token = sessionStorage.getItem('bearer');
  return fetch(SERVELEGAL + path, {
    headers: {
      'Authorization': 'Bearer ' + (token || ''),
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'https://www.secure-servelegal.co.uk/'
    }
  });
}

function local(path, options) {
  return fetch(LOCAL + path, options);
}
