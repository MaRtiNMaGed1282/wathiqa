function isEmpty(value) {
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  return false;
}

function isValidMoney(value) {
  if (value === undefined || value === null) {
    return false;
  }

  const parsedValue = Number(value);

  return !Number.isNaN(parsedValue) && parsedValue >= 0;
}

module.exports = {
  isEmpty,
  isValidMoney,
};
