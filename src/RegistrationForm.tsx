import React, { useState, useEffect } from 'react';
import {
  loadStripe,
  Appearance,
} from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe('pk_test_mIxZkn1tZB79hVBpRnTfuoB7');

const RegistrationForm: React.FC = () => {
  // State to hold form data entered by the user
  const [formData, setFormData] = useState({
    email: '',
    companyName: '',
    firstName: '',
    lastName: '',
    phone: '',
    activity: '',
    industry: '',
    numberOfClients: '',
  });

  // State to hold the client secret from Stripe for the Setup Intent
  const [clientSecret, setClientSecret] = useState<string | undefined>(undefined);

  // Function to handle changes in input fields and update formData state
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // useEffect hook to fetch the client secret when the component mounts
  useEffect(() => {
    // Create a Setup Intent on the backend as soon as the page loads
    fetch('http://localhost:8080/api/create-setup-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Include the Authorization header with your JWT token if required
        // 'Authorization': 'Bearer YOUR_JWT_TOKEN',
      },
      body: JSON.stringify({}), // No body content needed for this request
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.clientSecret) {
          // Set the client secret in state
          setClientSecret(data.clientSecret);
        } else {
          console.error('Client secret not returned from backend');
        }
      })
      .catch((error) => {
        console.error('Error fetching client secret:', error);
      });
  }, []);

  // Appearance customization for Stripe Elements
  const appearance: Appearance = {
    theme: 'stripe',
  };

  // Options for Stripe Elements
  const options = {
    clientSecret,
    appearance,
  };

  return clientSecret ? (
    // Render the Stripe Elements wrapper with the client secret and options
    <Elements stripe={stripePromise} options={options}>
      {/* Pass formData and handleInputChange to the CheckoutForm component */}
      <CheckoutForm formData={formData} handleInputChange={handleInputChange} />
    </Elements>
  ) : (
    <div>Loading...</div>
  );
};

interface CheckoutFormProps {
  formData: {
    [key: string]: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  formData,
  handleInputChange,
}) => {
  const stripe = useStripe(); // Hook to access Stripe.js
  const elements = useElements(); // Hook to access Elements
  const [errorMessage, setErrorMessage] = useState<string>(''); // State for error messages
  const [isProcessing, setIsProcessing] = useState<boolean>(false); // State to manage form submission
  const [successMessage, setSuccessMessage] = useState<string>(''); // State for success messages

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet; disable form submission until it has loaded
      return;
    }

    setIsProcessing(true); // Disable the submit button to prevent multiple submissions

    // Confirm the card setup to get the payment method ID
    const result = await stripe.confirmSetup({
      elements,
      confirmParams: {
        // No need for a return_url since we're handling the result in the same component
      },
      redirect: 'if_required',
    });

    if (result.error) {
      // Show error to your customer (e.g., incomplete card details)
      setErrorMessage(result.error.message ?? 'An error occurred.');
      setIsProcessing(false);
    } else if (result.setupIntent) {
      // The setup has succeeded; now send the payment method ID and form data to your backend
      const response = await fetch('http://localhost:8080/api/continue-registration', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Include the Authorization header with your JWT token if required
          // 'Authorization': 'Bearer YOUR_JWT_TOKEN',
        },
        body: JSON.stringify({
          ...formData,
          paymentMethodId: result.setupIntent.payment_method,
          priceId: 'price_1Q4m4a2E0iO3DqVnjYwke4HA', // This is the actual price ID (the sole subscription Trevor has setup)
        }),
      });

      const resultData = await response.json();

      if (response.ok) {
        // Registration and payment were successful
        console.log('Registration and payment successful:', resultData);
        setErrorMessage('');
        setSuccessMessage('Registration and payment successful!');
        // Optionally, clear the form or redirect the user
      } else {
        // Handle error from backend
        setErrorMessage(resultData.message || 'Registration failed.');
      }

      setIsProcessing(false);
    }
  };

  return (
    <div className="test-registration">
      <h1>YEAH APP CONTINUE REGISTRATION</h1>
      <form className="entire-form" onSubmit={handleSubmit}>
        <div className="registration-form">
          {/* Left side: Registration Form */}
          <div className="registrationDetails">
            <h2>Customer Details</h2>
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="companyName"
              placeholder="Company Name"
              required
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="firstName"
              placeholder="First Name"
              required
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="lastName"
              placeholder="Last Name"
              required
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="phone"
              placeholder="Phone"
              required
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="activity"
              placeholder="Activity"
              required
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="industry"
              placeholder="Industry"
              required
              onChange={handleInputChange}
            />
            <input
              type="number"
              name="numberOfClients"
              placeholder="Number Of Clients"
              required
              onChange={handleInputChange}
            />
          </div>

          {/* Right side: Stripe Payment Element */}
          <div className="stripe-element">
            <h2>Payment Details</h2>
            {/* PaymentElement will display the card input fields */}
            <PaymentElement />
          </div>
        </div>

        {/* Submit button */}
        <button type="submit" disabled={!stripe || isProcessing}>
          {isProcessing ? 'Processing...' : 'Purchase'}
        </button>

        {/* Display error message if any */}
        {errorMessage && <div style={{ color: 'red' }}>{errorMessage}</div>}
        {/* Display success message if registration is successful */}
        {successMessage && <div style={{ color: 'green' }}>{successMessage}</div>}
      </form>
    </div>
  );
};

export default RegistrationForm;
