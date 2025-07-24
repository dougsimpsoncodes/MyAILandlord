import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './navigation/AuthStack';
import MainStack from './navigation/MainStack';
import { AuthContext } from './context/AuthContext';
import { RoleContext } from './context/RoleContext';

const AppNavigator = () => {
  const { user } = useContext(AuthContext);
  const { userRole } = useContext(RoleContext);

  return (
    <NavigationContainer>
      {user && userRole ? (
        <MainStack userRole={userRole} />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;