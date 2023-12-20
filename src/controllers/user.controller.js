import asyncHandler from "../utils/asyncHandler.js"
import ApiError from "../utils/ApiError.js"
import { User } from '../models/user.models.js'
import uploadOnCloudinary from "../utils/cloudinary.js"
import ApiResponse from "../utils/ApiResponse.js"

const registerUser = asyncHandler( async (req, res, next) => {

  // get data from request body
  const { fullName, username, email, password } = req.body

  // check empty validations from request body fields
  if ([fullName, email, username, password].some((field) => field?.trim() === "")){
    console.log("if called!!!");
    return res.status(400).json(
      new ApiResponse(400, "All fields are required!")
    )
  }

  // check user already exist or not
  const existingUser = await User.findOne({
    $or: [{ username }, { email }]
  })

  console.log("existing user", existingUser);

  if (existingUser) {
    // throw new ApiError(400, "User already existed with email or username!")
    return res.status(400).json(
      new ApiResponse(400, "User already existed with email or username!")
    )
  }

  // avatar and cover image upload
  let avatarLocalPath;
  let coverImageLocalPath;

  if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
    avatarLocalPath = req.files.avatar[0].path
  }

  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
  }

  if (!avatarLocalPath){
    // throw new ApiError(400, "Avatar image required!")
    return res.status(400).json(
      new ApiResponse(400, "Avatar image required!")
    )
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  let coverImage;

  if(coverImageLocalPath){
    coverImage = await uploadOnCloudinary(coverImageLocalPath)
  }
  
  if(!avatar){
    // throw new ApiError(400, "Avatar image required!")
    return res.status(400).json(
      new ApiResponse(400, "Avatar image required!")
    )
  }

  // create user in db
  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || ""
  })

  // final response
  const createdUser = await User.findById(user._id).select("-password -refreshToken")

  if (!createdUser){
    // throw new ApiError(500, 'Something went wrong while registering the user!')
    return res.status(500).json(
      new ApiResponse(500, "Something went wrong while registering the user!")
    )
  }

  return res.status(201).json(
    new ApiResponse(200, "User registered Successfully!", createdUser)
    )

})

export { registerUser }