const User = require("../models/User");
const router = require("express").Router();
const bcrypt = require("bcrypt");

//update user
router.put("/:id", async (req, res) => {
  if (req.body.userId === req.params.id || req.body.isAdmin) {
    if (req.body.password) {
      try {
        const salt = await bcrypt.genSalt(10);
        req.body.password = await bcrypt.hash(req.body.password, salt);
      } catch (err) {
        return res.status(500).json(err);
      }
    }
    try {
      const user = await User.findByIdAndUpdate(req.params.id, {
        $set: req.body,
      });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json({ message: 'Account has been updated', user: user });
    } catch (err) {
      return res.status(500).json(err);
    }
  } else {
    return res.status(403).json("You can update only your account!");
  }
});

//delete user
router.delete("/:id", async (req, res) => {
  if (req.body.userId === req.params.id || req.body.isAdmin) {
    try {
      await User.findByIdAndDelete(req.params.id);
      res.status(200).json("Account has been deleted");
    } catch (err) {
      return res.status(500).json(err);
    }
  } else {
    return res.status(403).json("You can delete only your account!");
  }
});

//get a user by query method
router.get("/", async (req, res) => {
  const { userId, username } = req.query;
  try {
    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (username) {
      user = await User.findOne({ username }).maxTimeMS(15000);
    } else {
      return res.status(400).json({ message: 'Missing userId or username' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password, updatedAt, ...other } = user._doc;
    res.status(200).json(other);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


//get a user
// router.get("/:id", async (req, res) => {
//   try {
//     const user = await User.findById(req.params.id);
//     const { password, updatedAt, ...other } = user._doc;
//     res.status(200).json(other);
//   } catch (err) {
//     res.status(500).json(err);
//   }
// });

//get friends
router.get("/friends/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const friends = await Promise.all(
      user.followings.map((friendId) => {
        return User.findById(friendId);
      })
    );
    let friendList = [];
    friends.map((friend) => {
      const { _id, username, profilePicture } = friend;
      friendList.push({ _id, username, profilePicture });
    });
    res.status(200).json(friendList)
  } catch (err) {
    res.status(500).json(err);
  }
});

//follow a user

// router.put("/:id/follow", async (req, res) => {
//   if (req.body.userId !== req.params.id) {
//     try {
//       const user = await User.findById(req.params.id);
//       const currentUser = await User.findById(req.body.userId);
//       if (!user.followers.includes(req.body.userId)) {
//         await user.updateOne({ $push: { followers: req.body.userId } });
//         await currentUser.updateOne({ $push: { followings: req.params.id } });
//         res.status(200).json("user has been followed");
//       } else {
//         await user.updateOne({ $pull: { followers: req.body.userId } });
//         await currentUser.updateOne({ $pull: { followings: req.params.id } });
//         res.status(200).json("user has been unfollowed");
//       }
//     } catch (err) {
//       res.status(500).json(err);
//     }
//   } else {
//     res.status(403).json("you cant follow yourself");
//   }
// });

//follow & unfollow a user
router.put("/:id/follow", async (req, res) => {
  try {
    const user = await User.findById(req.params.id); // The user to be followed/unfollowed
    const currentUser = await User.findById(req.body.userId); // The current user performing the action

    if (!user || !currentUser) {
      return res.status(404).json({ msg: "User not found." });
    }

    if (req.params.id === req.body.userId) {
      // Check if the user is trying to follow themselves
      return res.status(400).json({ msg: "You can't follow yourself." });
    }

    if (user.followers.includes(req.body.userId)) {
      // User is already a follower, so remove the follower
      user.followers = user.followers.filter((id) => id.toString() !== req.body.userId);
      currentUser.followings = currentUser.followings.filter((id) => id.toString() !== req.params.id);
      await user.save();
      await currentUser.save();
      res.status(200).json({ msg: "User has been unfollowed", user, currentUser });
    } else {
      // User is not a follower, so add the follower
      user.followers.push(req.body.userId);
      currentUser.followings.push(req.params.id);
      await user.save();
      await currentUser.save();
      res.status(200).json({ msg: "User has been followed", user, currentUser });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




//unfollow a user

// router.put("/:id/unfollow", async (req, res) => {
//   if (req.body.userId !== req.params.id) {
//     try {
//       const user = await User.findById(req.params.id);
//       const currentUser = await User.findById(req.body.userId);
//       if (user.followers.includes(req.body.userId)) {
//         await user.updateOne({ $pull: { followers: req.body.userId } });
//         await currentUser.updateOne({ $pull: { followings: req.params.id } });
//         res.status(200).json("user has been unfollowed");
//       } else {
//         res.status(403).json("you dont follow this user");
//       }
//     } catch (err) {
//       res.status(500).json(err);
//     }
//   } else {
//     res.status(403).json("you cant unfollow yourself");
//   }
// });



module.exports = router;
