"""
Simple Python Calculator

A basic calculator with input validation that supports:
- Addition
- Subtraction
- Multiplication
- Division

This module demonstrates clean input handling and error management.
"""


def get_number(prompt: str) -> float:
    """
    Prompt the user for a number and validate the input.
    
    Args:
        prompt: The message to display when asking for input.
        
    Returns:
        The validated float value entered by the user.
        
    Raises:
        ValueError: If the input cannot be converted to a number.
    """
    while True:
        try:
            value = float(input(prompt))
            return value
        except ValueError:
            print("Error: Please enter a valid number.")


def get_operation() -> str:
    """
    Prompt the user for an operation and validate the input.
    
    Returns:
        A valid operation symbol (+, -, *, /).
    """
    operations = ['+', '-', '*', '/']
    
    while True:
        operation = input("Enter operation (+, -, *, /): ").strip()
        if operation in operations:
            return operation
        else:
            print(f"Error: Invalid operation. Please enter one of: {', '.join(operations)}")


def calculator(a: float, b: float, operation: str) -> float:
    """
    Perform a calculation between two numbers.
    
    Args:
        a: The first number.
        b: The second number.
        operation: The mathematical operation to perform.
        
    Returns:
        The result of the calculation.
        
    Raises:
        ZeroDivisionError: If division by zero is attempted.
    """
    if operation == '+':
        return a + b
    elif operation == '-':
        return a - b
    elif operation == '*':
        return a * b
    elif operation == '/':
        if b == 0:
            raise ZeroDivisionError("Cannot divide by zero")
        return a / b
    else:
        raise ValueError(f"Unknown operation: {operation}")


def main():
    """
    Main calculator loop.
    
    Repeatedly prompts the user for numbers and operations,
    then displays the result.
    """
    print("=" * 40)
    print("Simple Python Calculator")
    print("=" * 40)
    
    while True:
        print()
        
        # Get first number
        num1 = get_number("Enter first number: ")
        
        # Get operation
        operation = get_operation()
        
        # Get second number
        num2 = get_number("Enter second number: ")
        
        # Calculate and display result
        try:
            result = calculator(num1, num2, operation)
            print()
            print(f"Result: {num1} {operation} {num2} = {result}")
        except ZeroDivisionError as e:
            print(f"Error: {e}")
        
        print()
        
        # Ask if user wants to continue
        continue_choice = input("Calculate again? (y/n): ").strip().lower()
        if continue_choice != 'y' and continue_choice != 'yes':
            print("Goodbye!")
            break


# Run the calculator if this file is executed directly
if __name__ == "__main__":
    main()
