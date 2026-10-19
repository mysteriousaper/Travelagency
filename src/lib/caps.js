/** For text shown in CSS uppercase. Browsers uppercase the Armenian "և" to the
    old-spelling "ԵՒ"; written as "եվ" it becomes the correct "ԵՎ". */
export function caps(text) {
  return String(text).replace(/և/g, 'եվ');
}
