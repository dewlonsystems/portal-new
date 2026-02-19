import random
import string

def generate_reference_code(prefix, length=8):
    """
    Generates a reference code with a specific prefix and alphanumeric body.
    Example: DP5TG20VG1
    """
    chars = string.ascii_uppercase + string.digits
    random_part = ''.join(random.choices(chars, k=length))
    return f"{prefix}{random_part}"

def validate_reference_code(code, prefix):
    """
    Validates if a code starts with the correct prefix and has the correct length.
    Total length = len(prefix) + 8
    """
    if not code:
        return False
    expected_length = len(prefix) + 8
    if len(code) != expected_length:
        return False
    if not code.startswith(prefix):
        return False
    return True