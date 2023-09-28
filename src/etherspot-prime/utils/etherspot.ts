export const parseEtherspotErrorMessageIfAvailable = (error: any): string | undefined => {
  let etherspotErrorMessage;

  try {
    // parsing etherspot estimate error based on return scheme
    const errorMessageJson = JSON.parse(error.message.trim());
    etherspotErrorMessage = Object.values(errorMessageJson[0].constraints)[0] as string;
  } catch (e) {
    // unable to parse etherspot json
  }

  return etherspotErrorMessage;
};
