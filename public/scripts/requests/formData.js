export async function formDataRequest(url, method, body) {
  // The request options
  const requestOptions = {
    method,
    body: body
  };

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
    else return await res.json();
  } catch (err) {
    console.log(err, err.redirected, err.url);
    // Return the error
    return { error: await err.json() };
  }
}
