"""
DateTime utilities for timezone-aware operations
Handles UTC storage and local timezone display (IST by default)
"""

from datetime import datetime, timezone, timedelta


# India Standard Time (IST) is UTC+5:30
IST = timezone(timedelta(hours=5, minutes=30))


def now_utc():
    """Get current UTC time with timezone awareness"""
    return datetime.now(timezone.utc)


def now_ist():
    """Get current IST time"""
    return datetime.now(IST)


def utc_to_ist(utc_dt):
    """
    Convert UTC datetime to IST
    
    Args:
        utc_dt: datetime object in UTC
        
    Returns:
        datetime object in IST
    """
    if utc_dt.tzinfo is None:
        # If naive datetime, assume it's UTC
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)
    
    return utc_dt.astimezone(IST)


def ist_to_utc(ist_dt):
    """
    Convert IST datetime to UTC
    
    Args:
        ist_dt: datetime object in IST
        
    Returns:
        datetime object in UTC
    """
    if ist_dt.tzinfo is None:
        # If naive datetime, assume it's IST
        ist_dt = ist_dt.replace(tzinfo=IST)
    
    return ist_dt.astimezone(timezone.utc)


def format_ist(dt, format_str="%d/%m/%Y, %I:%M %p"):
    """
    Format datetime in IST timezone
    
    Args:
        dt: datetime object (UTC or IST)
        format_str: strftime format string
        
    Returns:
        Formatted string in IST
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    ist_dt = dt.astimezone(IST)
    return ist_dt.strftime(format_str)
