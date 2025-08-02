from pydantic import BaseModel


class LoginUser(BaseModel):
    name: str
    email: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: LoginUser


class Message(BaseModel):
    detail: str