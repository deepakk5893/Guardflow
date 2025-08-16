import re
import logging
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)


class SafetyFilterService:
    """Basic safety filtering for dummy task API access"""
    
    def __init__(self):
        # Basic harmful content patterns
        self.harmful_patterns = [
            # Violence and harmful content
            r'\b(kill|murder|assassinate|bomb|terrorist|weapon|gun|knife)\b',
            r'\b(suicide|self-harm|hurt yourself)\b',
            r'\b(hate|racist|nazi|genocide)\b',
            
            # Illegal activities
            r'\b(illegal|drugs|cocaine|heroin|fraud|hack|steal)\b',
            r'\b(money laundering|tax evasion|identity theft)\b',
            
            # Adult content
            r'\b(sexual|pornographic|explicit|adult content)\b',
            
            # Spam and abuse
            r'\b(spam|scam|phishing|malware|virus)\b',
        ]
        
        # Compile patterns for performance
        self.compiled_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.harmful_patterns]
        
        # Suspicious request patterns
        self.suspicious_patterns = [
            r'(ignore|disregard|bypass).*(?:instruction|rule|filter|safety)',
            r'pretend.*(?:not|don\'t).*(?:exist|matter|apply)',
            r'act.*as.*(?:unrestricted|uncensored|jailbreak)',
        ]
        
        self.compiled_suspicious = [re.compile(pattern, re.IGNORECASE) for pattern in self.suspicious_patterns]
    
    def check_content_safety(self, content: str) -> Dict:
        """
        Check if content passes basic safety filters
        
        Returns: {
            "safe": bool,
            "risk_level": str,  # "low", "medium", "high"
            "reasons": List[str],
            "action": str  # "allow", "warn", "block"
        }
        """
        try:
            if not content or not content.strip():
                return {
                    "safe": True,
                    "risk_level": "low",
                    "reasons": [],
                    "action": "allow"
                }
            
            content_lower = content.lower().strip()
            reasons = []
            risk_level = "low"
            
            # Check for harmful content patterns
            harmful_matches = []
            for pattern in self.compiled_patterns:
                matches = pattern.findall(content)
                if matches:
                    harmful_matches.extend(matches)
            
            if harmful_matches:
                reasons.append(f"Harmful content detected: {', '.join(set(harmful_matches))}")
                risk_level = "high"
            
            # Check for suspicious patterns (jailbreak attempts)
            suspicious_matches = []
            for pattern in self.compiled_suspicious:
                if pattern.search(content):
                    suspicious_matches.append("jailbreak_attempt")
            
            if suspicious_matches:
                reasons.append("Suspicious request pattern detected")
                risk_level = "medium" if risk_level == "low" else "high"
            
            # Check for excessively long requests (potential spam)
            if len(content) > 10000:  # 10K characters
                reasons.append("Excessively long request")
                risk_level = "medium" if risk_level == "low" else risk_level
            
            # Check for repetitive content (spam detection)
            if self._is_repetitive_content(content):
                reasons.append("Repetitive content detected")
                risk_level = "medium" if risk_level == "low" else risk_level
            
            # Determine action based on risk level
            if risk_level == "high":
                action = "block"
                safe = False
            elif risk_level == "medium":
                action = "warn"
                safe = True  # Allow but log warning
            else:
                action = "allow"
                safe = True
            
            result = {
                "safe": safe,
                "risk_level": risk_level,
                "reasons": reasons,
                "action": action
            }
            
            # Log safety check results
            if not safe or action == "warn":
                logger.warning(f"Safety filter triggered: {result}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in safety check: {e}")
            # Fail safe - block on error
            return {
                "safe": False,
                "risk_level": "high", 
                "reasons": [f"Safety check error: {str(e)}"],
                "action": "block"
            }
    
    def check_messages_safety(self, messages: List[Dict]) -> Dict:
        """Check safety for a list of messages (chat format)"""
        try:
            all_content = []
            
            # Extract content from all messages
            for message in messages:
                if isinstance(message, dict) and "content" in message:
                    content = message["content"]
                    if isinstance(content, str):
                        all_content.append(content)
            
            # Combine all content for checking
            combined_content = "\n".join(all_content)
            
            return self.check_content_safety(combined_content)
            
        except Exception as e:
            logger.error(f"Error checking messages safety: {e}")
            return {
                "safe": False,
                "risk_level": "high",
                "reasons": [f"Messages safety check error: {str(e)}"],
                "action": "block"
            }
    
    def _is_repetitive_content(self, content: str) -> bool:
        """Check if content is excessively repetitive (spam detection)"""
        try:
            if len(content) < 100:
                return False
            
            # Split into words
            words = content.lower().split()
            if len(words) < 10:
                return False
            
            # Check for word repetition
            word_counts = {}
            for word in words:
                word_counts[word] = word_counts.get(word, 0) + 1
            
            # If any word appears more than 30% of the time, it's repetitive
            max_count = max(word_counts.values())
            repetition_ratio = max_count / len(words)
            
            return repetition_ratio > 0.3
            
        except Exception:
            return False
    
    def get_safety_stats(self) -> Dict:
        """Get statistics about safety filtering"""
        return {
            "harmful_patterns_count": len(self.harmful_patterns),
            "suspicious_patterns_count": len(self.suspicious_patterns),
            "max_content_length": 10000,
            "max_repetition_ratio": 0.3
        }
    
    def add_custom_pattern(self, pattern: str, pattern_type: str = "harmful") -> bool:
        """Add a custom safety pattern (for future extensibility)"""
        try:
            compiled_pattern = re.compile(pattern, re.IGNORECASE)
            
            if pattern_type == "harmful":
                self.harmful_patterns.append(pattern)
                self.compiled_patterns.append(compiled_pattern)
            elif pattern_type == "suspicious":
                self.suspicious_patterns.append(pattern)
                self.compiled_suspicious.append(compiled_pattern)
            else:
                return False
            
            logger.info(f"Added custom {pattern_type} pattern: {pattern}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding custom pattern: {e}")
            return False


# Global instance for reuse
safety_filter = SafetyFilterService()