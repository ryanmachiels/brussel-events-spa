// validation.js — validatie voor het notitie-formulier van een favoriet.

export const MAX_NOTE_LENGTH = 200;

// Valideert een notitie: verplicht (niet leeg) en maximaal MAX_NOTE_LENGTH
// tekens. Geeft { valid, error } terug zodat de UI een nette boodschap toont.
export const validateNote = (value) => {
  const text = `${value ?? ''}`.trim();

  if (text === '') {
    return { valid: false, error: 'Notitie mag niet leeg zijn.' };
  }
  if (text.length > MAX_NOTE_LENGTH) {
    return {
      valid: false,
      error: `Notitie mag maximaal ${MAX_NOTE_LENGTH} tekens bevatten (nu ${text.length}).`,
    };
  }

  return { valid: true, error: '' };
};
