import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, chanegePassword, getCurrentUser, updateUserAvatar, updateAccountDetails } from "../controllers/user.controller.js";
import  { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"


const router = Router()

// upload is used to inject middleware to handle files upload
router.route('/register').post(
  upload.fields([
    {
      name: 'avatar',
      maxCont: 1
    },
    {
      name: 'coverImage',
      maxCount: 1
    }
  ]), 
  registerUser
)

router.route('/login').post(loginUser)
router.route('/logout').delete(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route('/change-password').post(verifyJWT, chanegePassword)
router.route('/current-user').get(verifyJWT, getCurrentUser)
router.route('/update-avatar').patch(verifyJWT, updateUserAvatar)
router.route('/update-account-details').patch(verifyJWT, updateAccountDetails)

export default router