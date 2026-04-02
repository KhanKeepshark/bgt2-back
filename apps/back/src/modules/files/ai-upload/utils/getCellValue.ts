export const getCellRawValue = (row: (string | number)[], index: number) => {
  return row[index];
};

export const getCellValue = (
  row: (string | number)[],
  index: number,
  optional = false,
): string => {
  const raw = getCellRawValue(row, index);
  if ((raw === undefined || raw === null || raw === '') && optional) {
    return '';
  }
  return `${raw ?? ''}`.trim();
};
