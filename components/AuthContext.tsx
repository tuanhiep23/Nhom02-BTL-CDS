'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Get users from localStorage or use default mock users
const getUsers = (): any[] => {
  if (typeof window !== 'undefined') {
    const savedUsers = localStorage.getItem('mockUsers');
    if (savedUsers) {
      return JSON.parse(savedUsers);
    }
  }
  
  // Default mock users
  const defaultUsers = [
    {
      id: '1',
      username: 'hằng',
      email: 'hang@example.com',
      password: '123456',
      name: 'Nguyễn Thị Hằng',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hang'
    },
    {
      id: '2',
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123',
      name: 'Administrator',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'
    }
  ];
  
  // Save default users to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('mockUsers', JSON.stringify(defaultUsers));
  }
  
  return defaultUsers;
};

// Save users to localStorage
const saveUsers = (users: any[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mockUsers', JSON.stringify(users));
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get current users from localStorage
    const users = getUsers();
    
    // Check against users
    const foundUser = users.find((u: any) => u.email === email && u.password === password);
    
    if (foundUser) {
      const userData: User = {
        id: foundUser.id,
        username: foundUser.username,
        email: foundUser.email,
        name: foundUser.name,
        avatar: foundUser.avatar
      };
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const register = async (username: string, email: string, password: string, name: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get current users from localStorage
    const users = getUsers();
    
    // Check if email already exists
    const existingUser = users.find((u: any) => u.email === email);
    if (existingUser) {
      setIsLoading(false);
      return false;
    }
    
    // Create new user
    const newUser: User = {
      id: Date.now().toString(),
      username,
      email,
      name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
    };
    
    // Add new user to users list and save to localStorage
    const updatedUsers = [...users, { ...newUser, password }];
    saveUsers(updatedUsers);
    
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
