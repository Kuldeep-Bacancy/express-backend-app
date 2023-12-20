import asyncHandler from "../utils/asyncHandler.js"
import ApiError from "../utils/ApiError.js"
import { User } from '../models/user.models.js'
import uploadOnCloudinary from "../utils/cloudinary.js"
import ApiResponse from "../utils/ApiResponse.js"
import jwt from 'jsonwebtoken'

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }

  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating referesh and access token")
  }
}

const registerUser = asyncHandler(async (req, res, next) => {

  // get data from request body
  const { fullName, username, email, password } = req.body

  // check empty validations from request body fields
  if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
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

  if (!avatarLocalPath) {
    // throw new ApiError(400, "Avatar image required!")
    return res.status(400).json(
      new ApiResponse(400, "Avatar image required!")
    )
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  let coverImage;

  if (coverImageLocalPath) {
    coverImage = await uploadOnCloudinary(coverImageLocalPath)
  }

  if (!avatar) {
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

  if (!createdUser) {
    // throw new ApiError(500, 'Something went wrong while registering the user!')
    return res.status(500).json(
      new ApiResponse(500, "Something went wrong while registering the user!")
    )
  }

  return res.status(201).json(
    new ApiResponse(200, "User registered Successfully!", createdUser)
  )

})

const loginUser = asyncHandler(async (req, res, next) => {
  const { email, username, password } = req.body

  if (!(username || email)) {
    res.status(400).json(
      new ApiResponse(400, "Please Provide username or email for login!")
    )
  }

  const existingUser = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (!existingUser) {
    return res.status(400).json(
      new ApiResponse(400, "User not found with this username or email")
    )
  }

  const passwordCheck = await existingUser.isPasswordCorrect(password)

  if (!passwordCheck) {
    return res.status(400).json(
      new ApiResponse(400, "credentials wrong!")
    )
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(existingUser._id)

  const loggedInUser = await User.findById(existingUser._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        "User logged In Successfully",
        {
          user: loggedInUser, accessToken, refreshToken
        }
      )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: null
      }
    },
    {
      new: true
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "Logout successfully!"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
    return res.status(401).json(
      new ApiResponse(401, "Unauthorized request")
    )
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )

    const user = await User.findById(decodedToken?._id)

    if (!user) {
      return res.status(401).json(
        new ApiResponse(401, "Invalid Refresh Token!")
      )
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      return res.status(401).json(
        new ApiResponse(401, "Refresh token is expired or used")
      )

    }

    const options = {
      httpOnly: true,
      secure: true
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          "Access token refreshed",
          { accessToken, refreshToken: refreshToken }
        )
      )
  } catch (error) {
    return res.status(401).json(
      new ApiResponse(401, error?.message || "Invalid refresh token")
    )
  }

})

const chanegePassword = asyncHandler( async (req, res) => {
  const { currentPassword, newPassword } = req.body

  if(!currentPassword || !newPassword){
    return res.status(400).json(
      new ApiResponse(400, "Please Enter currentPassword or newPassword!")
    )
  }

  const user = await User.findById(req.user?._id)
  const passwordCorrect = await user.isPasswordCorrect(currentPassword)

  if (!passwordCorrect) {
    return res.status(400).json(
      new ApiResponse(400, "currentPassword is wrong!")
    )
  }

  user.password = newPassword
  await user.save({ validateBeforeSave: false })
  
  return res
    .status(200)
    .json(new ApiResponse(200, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(
      200,
      "User fetched successfully",
      req.user
    ))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body

  if (!(fullName || email)) {
    return res.status(400).json(
      new ApiResponse(400, "All field is required!")
    )
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email
      }
    },
    { new: true }

  ).select("-password")

  return res
    .status(200)
    .json(new ApiResponse(200, "Account details updated successfully", user))
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path

  if (!avatarLocalPath) {
    return res.status(400).json(
      new ApiResponse(400, "Avatar image is missing!")
    )
  }

  //TODO: delete old image - assignment

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if (!avatar.url) {
    return res.status(400).json(
      new ApiResponse(400, "Error while uploading on avatar")
    )

  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    { new: true }
  ).select("-password")

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Avatar image updated successfully", user)
    )
})


export { registerUser, loginUser, logoutUser, refreshAccessToken, chanegePassword, getCurrentUser, updateUserAvatar, updateAccountDetails }