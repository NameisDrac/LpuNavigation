(function () {
'use strict';
var list = document.getElementById('offList'), q = document.getElementById('offQ'), n = document.getElementById('offCount');
var places = (typeof CAMPUS_PLACES !== 'undefined' ? CAMPUS_PLACES : []).filter(function (p) { return Number.isFinite(p.lat) && Number.isFinite(p.lng); }).sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });
function render() {
var t = q.value.trim().toLowerCase(); list.textContent = '';
var shown = places.filter(function (p) { return !t || (p.name + ' ' + p.category).toLowerCase().indexOf(t) > -1; });
n.textContent = shown.length + ' of ' + places.length + ' places';
shown.forEach(function (p) {
var li = document.createElement('li'), a = document.createElement('a');
a.className = 'btn'; a.style.cssText = 'width:100%;justify-content:space-between;text-align:left';
a.href = 'geo:' + p.lat + ',' + p.lng + '?q=' + p.lat + ',' + p.lng + '(' + encodeURIComponent(p.name) + ')';
var s = document.createElement('span'); s.textContent = p.name; var c = document.createElement('small'); c.textContent = p.lat.toFixed(5) + ', ' + p.lng.toFixed(5);
a.append(s, c); li.append(a); list.append(li);
});
}
q.addEventListener('input', render); render();
document.getElementById('retry').addEventListener('click', function () { location.href = './'; });
})();