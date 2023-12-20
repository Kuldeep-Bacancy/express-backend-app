import { Router } from "express";
import { registerUser, loginUser, logoutUser } from "../controllers/user.controller.js";
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

export default router