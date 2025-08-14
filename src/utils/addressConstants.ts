// US States and address validation constants following industry standards

export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' }
];

// Validation patterns following industry standards
export const ADDRESS_PATTERNS = {
  // US ZIP Code: 5 digits or 5+4 format
  US_ZIP_CODE: /^\d{5}(-\d{4})?$/,
  
  // Basic street address (flexible format allowing various street address patterns)
  STREET_ADDRESS: /^[\w\d\s\-\.\#\/\&\(\)\'\"]+$/,
  
  // City name (letters, spaces, hyphens, apostrophes)
  CITY_NAME: /^[a-zA-Z\s\-\'\.]+$/,
  
  // State code (2 uppercase letters)
  STATE_CODE: /^[A-Z]{2}$/
};

// Address validation rules
export const ADDRESS_VALIDATION_RULES = {
  line1: {
    required: true,
    minLength: 3,
    maxLength: 100,
    pattern: ADDRESS_PATTERNS.STREET_ADDRESS
  },
  line2: {
    required: false,
    maxLength: 50
  },
  city: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: ADDRESS_PATTERNS.CITY_NAME
  },
  state: {
    required: true,
    pattern: ADDRESS_PATTERNS.STATE_CODE,
    validValues: US_STATES.map(s => s.code)
  },
  zipCode: {
    required: true,
    pattern: ADDRESS_PATTERNS.US_ZIP_CODE
  }
};