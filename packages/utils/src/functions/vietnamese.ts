/** Vietnamese letters with diacritics and, at the same index, the plain letter they fold to. */
export const VIETNAMESE_ACCENTED =
  'àÀáÁảẢãÃạẠăĂằẰắẮẳẲẵẴặẶâÂầẦấẤẩẨẫẪậẬèÈéÉẻẺẽẼẹẸêÊềỀếẾểỂễỄệỆìÌíÍỉỈĩĨịỊòÒóÓỏỎõÕọỌôÔồỒốỐổỔỗỖộỘơƠờỜớỚởỞỡỠợỢùÙúÚủỦũŨụỤưƯừỪứỨửỬữỮựỰỳỲýÝỷỶỹỸỵỴđĐ';
export const VIETNAMESE_PLAIN =
  'aAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAeEeEeEeEeEeEeEeEeEeEeEiIiIiIiIiIoOoOoOoOoOoOoOoOoOoOoOoOoOoOoOoOoOuUuUuUuUuUuUuUuUuUuUuUyYyYyYyYyYdD';

/**
 * Lowercases and strips Vietnamese diacritics so "Nguyễn Văn Đức" matches "nguyen van duc". SQL search folds columns
 * with `translate(col, VIETNAMESE_ACCENTED, VIETNAMESE_PLAIN)`, so both sides must use these two strings.
 */
export function foldVietnamese(text: string): string {
  let folded = '';
  for (const character of text.normalize('NFC')) {
    const index = VIETNAMESE_ACCENTED.indexOf(character);
    folded += index === -1 ? character : VIETNAMESE_PLAIN[index];
  }
  return folded.toLowerCase();
}
