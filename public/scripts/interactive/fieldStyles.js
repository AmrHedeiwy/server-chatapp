export function removeFieldStyles(fields) {
  fields.forEach((field) => {
    console.log(field);
    document.getElementById(`${field}Input`).classList.remove('is-invalid');
    document.getElementById(`${field}Feedback`).innerHTML = '';
    document.getElementById(`${field}Row`).style.paddingBottom = '';
  });
}

export function addFieldStyles(fields, error) {
  fields.forEach((field) => {
    if (field in error.details) {
      document.getElementById(`${field}Input`).classList.add('is-invalid');

      document.getElementById(`${field}Feedback`).innerHTML =
        error.details[field];

      // Calculate the height of the error message
      const errorHeight = document
        .getElementById(`${field}Feedback`)
        .getBoundingClientRect().height;

      // Add padding to the input container based on the height of the error message
      document.getElementById(`${field}Row`).style.paddingBottom =
        errorHeight + 'px';
    }
  });
}
