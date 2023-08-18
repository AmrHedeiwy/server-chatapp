export async function sendServerRequest(url, method, body) {
  // The request options
  const requestOptions = {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body) || null
  };

  // Remove the body if no value was added
  if (!body) {
    delete requestOptions.body;
  }

  // Attempt to send the request to the server
  try {
    const res = await fetch(url, requestOptions).then(async (response) => {
      // Success
      if (response.ok) return response;
      // Error
      throw response;
    });

    // If a success redirect was returned
    if (res.redirected) return { redirect: res.url };
    // If a success message was returned
    else return { message: await res.json() };
  } catch (err) {
    // Return the error
    return { error: await err.json() };
  }
}
