import { createMongoAbility, AbilityBuilder } from '@casl/ability';
import { User } from 'src/user/schema/user.schema';

export const defineAbility = (user: User) => {
  const { can, build } = new AbilityBuilder(createMongoAbility);

  if (user.role === 'admin') {
    can('manage', 'ski-centers', { _id: user.skiCenterId });
  }

  return build();
};

//I don't see a huge application for CASL in this case, because if I
//  create an ability for an admin to only edit their own ski center,
//  then I have to retrieve all of them and send them to the AbilityBuilder
//   to see which ones they can or cannot edit/delete.
