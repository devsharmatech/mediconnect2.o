'use client';

const Button = ({
  children,
  variant = 'primary',
  className = '',
  ...props
}) => {
  const baseStyles = 'font-medium py-3 px-6 rounded-lg shadow-sm transition duration-150 ease-in-out';

  const variants = {
    primary: 'bg-[#0067A1] hover:bg-[#004F7C] text-white',
    secondary: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  return (
    <button
      suppressHydrationWarning
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
